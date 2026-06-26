import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  collectionData,
  docData,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import {
  Net,
  NetType,
  NetMember,
  NetPresence,
  generateJoinCode,
} from '../shared/models/net.model';
import { AuditEventType } from '../shared/models/audit.model';

@Injectable({ providedIn: 'root' })
export class NetService {
  private firestore = inject(Firestore);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  /** Currently active net (if joined) */
  private _activeNet = signal<Net | null>(null);
  readonly activeNet = this._activeNet.asReadonly();

  /** Whether current user is NCS or backup for the active net */
  readonly isWriter = signal(false);

  /**
   * Create a new net (inviter+ only)
   */
  async createNet(data: {
    organization: string;
    netType: NetType;
    band?: string;
    freq?: string;
    notes?: string;
  }): Promise<string> {
    if (!this.userService.isInviter()) {
      throw new Error('Only inviters can create nets');
    }

    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    // Generate unique join code
    const joinCode = await this.generateUniqueJoinCode();

    const netsRef = collection(this.firestore, 'nets');
    const netDoc = await addDoc(netsRef, {
      organization: data.organization,
      netType: data.netType,
      createdBy: uid,
      ncs: uid, // Creator becomes NCS
      startTime: serverTimestamp(),
      band: data.band || null,
      freq: data.freq || null,
      notes: data.notes || null,
      status: 'active',
      joinCode,
    });

    // Add creator as member
    await setDoc(doc(this.firestore, 'nets', netDoc.id, 'members', uid), {
      joinedAt: serverTimestamp(),
    });

    // Log audit event
    await this.logAuditEvent('createNet', { netId: netDoc.id });

    return netDoc.id;
  }

  /**
   * Generate a unique join code among active nets
   */
  private async generateUniqueJoinCode(length = 6): Promise<string> {
    const netsRef = collection(this.firestore, 'nets');
    const activeNetsQuery = query(netsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(activeNetsQuery);

    const existingCodes = new Set(
      snapshot.docs.map((doc) => doc.data()['joinCode'])
    );

    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = generateJoinCode(length);
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Could not generate unique join code');
      }
    } while (existingCodes.has(code));

    return code;
  }

  /**
   * Join a net using a join code
   */
  async joinNet(joinCode: string): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const normalizedCode = joinCode.toUpperCase().trim();

    // Find net with this code
    const netsRef = collection(this.firestore, 'nets');
    const q = query(
      netsRef,
      where('status', '==', 'active'),
      where('joinCode', '==', normalizedCode)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Invalid join code or net is closed');
    }

    const netDoc = snapshot.docs[0];
    const netId = netDoc.id;

    // Add as member
    await setDoc(doc(this.firestore, 'nets', netId, 'members', uid), {
      joinedAt: serverTimestamp(),
    });

    // Load the net
    await this.loadNet(netId);

    return netId;
  }

  /**
   * Load a net by ID
   */
  async loadNet(netId: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const netRef = doc(this.firestore, 'nets', netId);
    const netDoc = await getDoc(netRef);

    if (!netDoc.exists()) {
      throw new Error('Net not found');
    }

    const data = netDoc.data();
    const net: Net = {
      id: netId,
      organization: data['organization'],
      netType: data['netType'],
      createdBy: data['createdBy'],
      ncs: data['ncs'],
      backupNcs: data['backupNcs'],
      startTime: (data['startTime'] as Timestamp)?.toDate(),
      endTime: (data['endTime'] as Timestamp)?.toDate(),
      band: data['band'],
      freq: data['freq'],
      notes: data['notes'],
      status: data['status'],
      joinCode: data['joinCode'],
      comments: data['comments'],
    };

    this._activeNet.set(net);
    this.isWriter.set(net.ncs === uid || net.backupNcs === uid);
  }

  /**
   * Get live net data as observable
   */
  getNetObservable(netId: string): Observable<Net | null> {
    const netRef = doc(this.firestore, 'nets', netId);
    return docData(netRef, { idField: 'id' }).pipe(
      map((docData) => {
        if (!docData) return null;
        const data = docData as Record<string, unknown>;
        return {
          id: data['id'] as string,
          organization: data['organization'] as string,
          netType: data['netType'] as Net['netType'],
          createdBy: data['createdBy'] as string,
          ncs: data['ncs'] as string,
          backupNcs: data['backupNcs'] as string | undefined,
          startTime: (data['startTime'] as Timestamp)?.toDate(),
          endTime: (data['endTime'] as Timestamp | undefined)?.toDate(),
          band: data['band'] as string | undefined,
          freq: data['freq'] as string | undefined,
          notes: data['notes'] as string | undefined,
          status: data['status'] as Net['status'],
          joinCode: data['joinCode'] as string,
          comments: data['comments'] as string | undefined,
        } as Net;
      })
    );
  }

  /**
   * Claim NCS role for a net
   */
  async claimNcs(netId: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const netRef = doc(this.firestore, 'nets', netId);

    await updateDoc(netRef, {
      ncs: uid,
    });

    await this.logAuditEvent('claimNcs', { netId });
    await this.loadNet(netId);
  }

  /**
   * Assign backup controller
   */
  async assignBackup(netId: string, backupUid: string | null): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const net = this._activeNet();
    if (!net || net.ncs !== uid) {
      throw new Error('Only NCS can assign backup controller');
    }

    const netRef = doc(this.firestore, 'nets', netId);
    await updateDoc(netRef, {
      backupNcs: backupUid,
    });

    if (backupUid) {
      await this.logAuditEvent('assignBackup', {
        netId,
        targetUid: backupUid,
      });
    }

    await this.loadNet(netId);
  }

  /**
   * Regenerate join code
   */
  async regenerateJoinCode(netId: string): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const net = this._activeNet();
    if (!net || (net.ncs !== uid && net.backupNcs !== uid)) {
      throw new Error('Only NCS or backup can regenerate join code');
    }

    const newCode = await this.generateUniqueJoinCode();
    const netRef = doc(this.firestore, 'nets', netId);

    await updateDoc(netRef, {
      joinCode: newCode,
    });

    await this.loadNet(netId);
    return newCode;
  }

  /**
   * Update net details
   */
  async updateNet(
    netId: string,
    data: Partial<Pick<Net, 'organization' | 'netType' | 'band' | 'freq' | 'notes' | 'comments'>>
  ): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const net = this._activeNet();
    if (!net || (net.ncs !== uid && net.backupNcs !== uid)) {
      throw new Error('Only NCS or backup can update net details');
    }

    const netRef = doc(this.firestore, 'nets', netId);
    await updateDoc(netRef, data);
    await this.loadNet(netId);
  }

  /**
   * Close a net
   */
  async closeNet(netId: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const net = this._activeNet();
    if (!net || (net.ncs !== uid && net.backupNcs !== uid)) {
      throw new Error('Only NCS or backup can close the net');
    }

    const netRef = doc(this.firestore, 'nets', netId);
    await updateDoc(netRef, {
      status: 'closed',
      endTime: serverTimestamp(),
    });

    await this.logAuditEvent('closeNet', { netId });
    this._activeNet.set(null);
    this.isWriter.set(false);
  }

  /**
   * Get net members
   */
  async getMembers(netId: string): Promise<NetMember[]> {
    const membersRef = collection(this.firestore, 'nets', netId, 'members');
    const snapshot = await getDocs(membersRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      joinedAt: (doc.data()['joinedAt'] as Timestamp)?.toDate(),
    }));
  }

  /**
   * Update presence heartbeat
   */
  async updatePresence(netId: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const callsign = this.userService.callsign();
    const presenceRef = doc(this.firestore, 'nets', netId, 'presence', uid);

    await setDoc(presenceRef, {
      lastSeen: serverTimestamp(),
      callsign,
    });
  }

  /**
   * Get presence data for a net
   */
  getPresenceObservable(netId: string): Observable<NetPresence[]> {
    const presenceRef = collection(this.firestore, 'nets', netId, 'presence');
    return collectionData(presenceRef, { idField: 'id' }).pipe(
      map((docs) =>
        docs.map((doc) => ({
          id: doc['id'],
          lastSeen: (doc['lastSeen'] as Timestamp)?.toDate(),
          callsign: doc['callsign'],
        }))
      )
    );
  }

  /**
   * Check if NCS presence is stale (> 60 seconds)
   */
  async isNcsPresenceStale(netId: string): Promise<boolean> {
    const net = this._activeNet();
    if (!net) return true;

    const presenceRef = doc(this.firestore, 'nets', netId, 'presence', net.ncs);
    const presenceDoc = await getDoc(presenceRef);

    if (!presenceDoc.exists()) return true;

    const lastSeen = (presenceDoc.data()['lastSeen'] as Timestamp)?.toDate();
    if (!lastSeen) return true;

    const staleThreshold = 60 * 1000; // 60 seconds
    return Date.now() - lastSeen.getTime() > staleThreshold;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    type: AuditEventType,
    data: { netId?: string; targetUid?: string }
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

  /**
   * Leave current net (clear local state)
   */
  leaveNet(): void {
    this._activeNet.set(null);
    this.isWriter.set(false);
  }
}
