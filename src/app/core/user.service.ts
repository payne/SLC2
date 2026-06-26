import { Injectable, inject, computed, signal, effect } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { User, isInviter, isRoot } from '../shared/models/user.model';
import { Invitation } from '../shared/models/invitation.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  /** Current app user (null if not signed in or no user doc) */
  private _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  /** Whether user data is still loading */
  readonly isLoading = signal(true);

  /** User access state */
  readonly accessState = signal<AccessState>('loading');

  /** Convenience computed properties */
  readonly isOperator = computed(() => !!this._currentUser());
  readonly isInviter = computed(() => isInviter(this._currentUser()));
  readonly isRoot = computed(() => isRoot(this._currentUser()));
  readonly callsign = computed(() => this._currentUser()?.callsign ?? null);

  /** Cache of uid -> callsign mappings */
  private callsignCache = new Map<string, string>();

  constructor() {
    // React to auth state changes
    effect(() => {
      const firebaseUser = this.authService.firebaseUser();
      const authLoading = this.authService.isLoading();

      if (authLoading) {
        this.accessState.set('loading');
        return;
      }

      if (!firebaseUser) {
        this._currentUser.set(null);
        this.isLoading.set(false);
        this.accessState.set('signed-out');
        return;
      }

      // Load user document
      this.loadUser(firebaseUser.uid, firebaseUser.email ?? '');
    });
  }

  /**
   * Load user document and check invitation status
   */
  private async loadUser(uid: string, email: string): Promise<void> {
    this.isLoading.set(true);
    this.accessState.set('loading');

    try {
      // Check if user document exists
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        this._currentUser.set({
          id: uid,
          email: userData['email'],
          callsign: userData['callsign'],
          level: userData['level'],
          root: userData['root'],
          invitedBy: userData['invitedBy'],
          joinedAt: (userData['joinedAt'] as Timestamp)?.toDate(),
          promotedBy: userData['promotedBy'],
          promotedAt: (userData['promotedAt'] as Timestamp)?.toDate(),
        });
        this.accessState.set('authorized');
      } else {
        // Check for pending invitation
        const hasInvite = await this.checkPendingInvitation(email);
        this._currentUser.set(null);
        this.accessState.set(hasInvite ? 'pending-claim' : 'no-access');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      this._currentUser.set(null);
      this.accessState.set('error');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Check if there's a pending invitation for this email
   */
  private async checkPendingInvitation(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const inviteDoc = await getDoc(
      doc(this.firestore, 'invitations', normalizedEmail)
    );

    if (inviteDoc.exists()) {
      const data = inviteDoc.data();
      return data['status'] === 'pending';
    }

    return false;
  }

  /**
   * Get pending invitation for current user's email
   */
  async getPendingInvitation(): Promise<Invitation | null> {
    const email = this.authService.email();
    if (!email) return null;

    const normalizedEmail = email.toLowerCase();
    const inviteDoc = await getDoc(
      doc(this.firestore, 'invitations', normalizedEmail)
    );

    if (inviteDoc.exists()) {
      const data = inviteDoc.data();
      if (data['status'] === 'pending') {
        return {
          id: normalizedEmail,
          email: data['email'],
          callsign: data['callsign'],
          level: data['level'],
          invitedBy: data['invitedBy'],
          createdAt: (data['createdAt'] as Timestamp)?.toDate(),
          status: data['status'],
        };
      }
    }

    return null;
  }

  /**
   * Claim a pending invitation and create user document
   */
  async claimInvitation(): Promise<void> {
    const uid = this.authService.uid();
    const email = this.authService.email();

    if (!uid || !email) {
      throw new Error('Not signed in');
    }

    const normalizedEmail = email.toLowerCase();

    // Get the invitation
    const inviteRef = doc(this.firestore, 'invitations', normalizedEmail);
    const inviteDoc = await getDoc(inviteRef);

    if (!inviteDoc.exists()) {
      throw new Error('No invitation found');
    }

    const inviteData = inviteDoc.data();
    if (inviteData['status'] !== 'pending') {
      throw new Error('Invitation is not pending');
    }

    // Create user document
    const userRef = doc(this.firestore, 'users', uid);
    await setDoc(userRef, {
      email: normalizedEmail,
      callsign: inviteData['callsign'],
      level: inviteData['level'],
      invitedBy: inviteData['invitedBy'],
      joinedAt: serverTimestamp(),
    });

    // Update invitation to claimed
    await updateDoc(inviteRef, {
      status: 'claimed',
      claimedAt: serverTimestamp(),
      claimedBy: uid,
    });

    // Reload user data
    await this.loadUser(uid, normalizedEmail);
  }

  /**
   * Refresh current user data from Firestore
   */
  async refreshUser(): Promise<void> {
    const uid = this.authService.uid();
    const email = this.authService.email();

    if (uid && email) {
      await this.loadUser(uid, email);
    }
  }

  /**
   * Get callsign for a user by UID (looks up from cache or Firestore)
   */
  getCallsignForUid(uid: string | undefined): string | null {
    if (!uid) return null;

    // Check if it's the current user
    const currentUser = this._currentUser();
    if (currentUser && currentUser.id === uid) {
      return currentUser.callsign;
    }

    // Check cache
    if (this.callsignCache.has(uid)) {
      return this.callsignCache.get(uid) ?? null;
    }

    // Fetch asynchronously and cache
    this.fetchAndCacheCallsign(uid);

    // Return uid as fallback while loading
    return uid.substring(0, 8) + '...';
  }

  /**
   * Fetch callsign from Firestore and cache it
   */
  private async fetchAndCacheCallsign(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      if (userDoc.exists()) {
        const callsign = userDoc.data()['callsign'];
        if (callsign) {
          this.callsignCache.set(uid, callsign);
        }
      }
    } catch {
      // Silently fail - will show truncated UID
    }
  }
}

export type AccessState =
  | 'loading'
  | 'signed-out'
  | 'authorized'
  | 'pending-claim'
  | 'no-access'
  | 'error';
