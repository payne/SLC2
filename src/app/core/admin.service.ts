import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { Invitation, InvitationLevel } from '../shared/models/invitation.model';
import { User } from '../shared/models/user.model';
import { AuditEvent, AuditEventType } from '../shared/models/audit.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private firestore = inject(Firestore);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  /**
   * Invite a new user (inviter+ only)
   */
  async inviteUser(
    email: string,
    callsign: string,
    level: InvitationLevel
  ): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can invite users');
    }

    const actorUid = this.authService.uid();
    if (!actorUid) throw new Error('Not signed in');

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCallsign = callsign.toUpperCase().trim();

    // Check if invitation already exists
    const inviteRef = doc(this.firestore, 'invitations', normalizedEmail);
    const existingInvite = await getDoc(inviteRef);

    if (existingInvite.exists()) {
      const data = existingInvite.data();
      if (data['status'] === 'pending') {
        throw new Error('Invitation already pending for this email');
      }
      if (data['status'] === 'claimed') {
        throw new Error('This email has already claimed an invitation');
      }
    }

    // Create invitation
    await setDoc(inviteRef, {
      email: normalizedEmail,
      callsign: normalizedCallsign,
      level,
      invitedBy: actorUid,
      createdAt: serverTimestamp(),
      status: 'pending',
    });

    // Log audit event
    await this.logAuditEvent('invite', {
      targetEmail: normalizedEmail,
      targetCallsign: normalizedCallsign,
      details: { level },
    });
  }

  /**
   * Promote an operator to inviter (inviter+ only)
   */
  async promoteUser(targetUid: string): Promise<void> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can promote users');
    }

    const actorUid = this.authService.uid();
    if (!actorUid) throw new Error('Not signed in');

    const userRef = doc(this.firestore, 'users', targetUid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData['level'] === 'inviter') {
      throw new Error('User is already an inviter');
    }

    await updateDoc(userRef, {
      level: 'inviter',
      promotedBy: actorUid,
      promotedAt: serverTimestamp(),
    });

    await this.logAuditEvent('promote', {
      targetUid,
      targetCallsign: userData['callsign'],
    });
  }

  /**
   * Demote an inviter to operator (root only)
   */
  async demoteUser(targetUid: string): Promise<void> {
    if (!this.userService.isRoot()) {
      throw new Error('Only root admins can demote users');
    }

    const userRef = doc(this.firestore, 'users', targetUid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData['root']) {
      throw new Error('Cannot demote a root user');
    }
    if (userData['level'] === 'operator') {
      throw new Error('User is already an operator');
    }

    await updateDoc(userRef, {
      level: 'operator',
      promotedBy: null,
      promotedAt: null,
    });

    await this.logAuditEvent('demote', {
      targetUid,
      targetCallsign: userData['callsign'],
    });
  }

  /**
   * Remove a user's access (root only)
   */
  async removeUser(targetUid: string): Promise<void> {
    if (!this.userService.isRoot()) {
      throw new Error('Only root admins can remove users');
    }

    const actorUid = this.authService.uid();
    if (targetUid === actorUid) {
      throw new Error('Cannot remove yourself');
    }

    const userRef = doc(this.firestore, 'users', targetUid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData['root']) {
      throw new Error('Cannot remove a root user');
    }

    // Delete user document
    await deleteDoc(userRef);

    // Revoke their invitation
    const email = userData['email'];
    if (email) {
      const inviteRef = doc(this.firestore, 'invitations', email);
      const inviteDoc = await getDoc(inviteRef);
      if (inviteDoc.exists()) {
        await updateDoc(inviteRef, {
          status: 'revoked',
          revokedAt: serverTimestamp(),
          revokedBy: actorUid,
        });
      }
    }

    // TODO: If user is NCS of any active net, free that seat

    await this.logAuditEvent('remove', {
      targetUid,
      targetEmail: email,
      targetCallsign: userData['callsign'],
    });
  }

  /**
   * Revoke a pending invitation
   * Inviter can revoke their own invitations; root can revoke any
   */
  async revokeInvitation(email: string): Promise<void> {
    const actorUid = this.authService.uid();
    if (!actorUid) throw new Error('Not signed in');

    const normalizedEmail = email.toLowerCase();
    const inviteRef = doc(this.firestore, 'invitations', normalizedEmail);
    const inviteDoc = await getDoc(inviteRef);

    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const inviteData = inviteDoc.data();
    if (inviteData['status'] !== 'pending') {
      throw new Error('Can only revoke pending invitations');
    }

    // Check permissions
    const isOwnInvite = inviteData['invitedBy'] === actorUid;
    if (!isOwnInvite && !this.userService.isRoot()) {
      throw new Error('Can only revoke your own invitations (or be root)');
    }

    await updateDoc(inviteRef, {
      status: 'revoked',
      revokedAt: serverTimestamp(),
      revokedBy: actorUid,
    });

    await this.logAuditEvent('revoke', {
      targetEmail: normalizedEmail,
      targetCallsign: inviteData['callsign'],
    });
  }

  /**
   * Get all users (for admin list)
   */
  async getAllUsers(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data['email'],
        callsign: data['callsign'],
        level: data['level'],
        root: data['root'],
        invitedBy: data['invitedBy'],
        joinedAt: (data['joinedAt'] as Timestamp)?.toDate(),
        promotedBy: data['promotedBy'],
        promotedAt: (data['promotedAt'] as Timestamp)?.toDate(),
      };
    });
  }

  /**
   * Get all pending invitations
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    const invitesRef = collection(this.firestore, 'invitations');
    const q = query(invitesRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data['email'],
        callsign: data['callsign'],
        level: data['level'],
        invitedBy: data['invitedBy'],
        createdAt: (data['createdAt'] as Timestamp)?.toDate(),
        status: data['status'],
      };
    });
  }

  /**
   * Log an audit event
   */
  private async logAuditEvent(
    type: AuditEventType,
    data: Partial<AuditEvent>
  ): Promise<void> {
    const actorUid = this.authService.uid();
    const actorCallsign = this.userService.callsign();

    const auditRef = collection(this.firestore, 'auditLog');
    await addDoc(auditRef, {
      type,
      actorUid,
      actorCallsign,
      timestamp: serverTimestamp(),
      ...data,
    });
  }
}
