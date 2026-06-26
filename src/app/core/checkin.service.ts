import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { RosterService } from './roster.service';
import { CheckIn, AttributeSnapshot } from '../shared/models/checkin.model';

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private rosterService = inject(RosterService);

  /** Check-ins for the active net */
  private _checkins = signal<CheckIn[]>([]);
  readonly checkins = this._checkins.asReadonly();

  /** Loading state */
  readonly isLoading = signal(true);

  /** Count of check-ins */
  readonly count = computed(() => this._checkins().length);

  /** Unsubscribe function for listener */
  private unsubscribe: (() => void) | null = null;

  /** Current net ID being listened to */
  private currentNetId: string | null = null;

  /**
   * Subscribe to check-ins for a net (real-time listener)
   */
  subscribeToNet(netId: string): void {
    // Unsubscribe from previous net if any
    this.unsubscribeFromNet();

    this.currentNetId = netId;
    this.isLoading.set(true);

    const checkinsRef = collection(this.firestore, 'nets', netId, 'checkins');
    const q = query(checkinsRef, orderBy('signInTime', 'desc'));

    this.unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const checkins = this.parseSnapshot(snapshot);
        this._checkins.set(checkins);
        this.isLoading.set(false);
      },
      (error) => {
        console.error('Error listening to check-ins:', error);
        this.isLoading.set(false);
      }
    );
  }

  /**
   * Parse Firestore snapshot to CheckIn array
   */
  private parseSnapshot(snapshot: QuerySnapshot<DocumentData>): CheckIn[] {
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        callsign: data['callsign'],
        firstName: data['firstName'],
        assignment: data['assignment'],
        location: data['location'],
        notes: data['notes'],
        mileage: data['mileage'],
        attributeSnapshot: data['attributeSnapshot'] || {},
        signInTime: (data['signInTime'] as Timestamp)?.toDate() || new Date(),
        signOutTime: (data['signOutTime'] as Timestamp)?.toDate(),
        createdBy: data['createdBy'],
        lastEditedBy: data['lastEditedBy'],
        lastEditedAt: (data['lastEditedAt'] as Timestamp)?.toDate(),
      };
    });
  }

  /**
   * Unsubscribe from current net
   */
  unsubscribeFromNet(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.currentNetId = null;
    this._checkins.set([]);
    this.isLoading.set(true);
  }

  /**
   * Add a new check-in
   */
  async addCheckIn(
    netId: string,
    data: {
      callsign: string;
      assignment?: string;
      location?: string;
      notes?: string;
      mileage?: number;
    }
  ): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    // Look up person in roster
    const person = this.rosterService.getPerson(data.callsign);

    // Get attribute config and build snapshot
    const config = this.rosterService.attributeConfig();
    const attributeSnapshot: AttributeSnapshot = {};

    if (person && config.attributeColumns.length > 0) {
      for (const col of config.attributeColumns) {
        const key = col.column as keyof AttributeSnapshot;
        attributeSnapshot[key] = person.attributes[col.key];
      }
    }

    const checkinsRef = collection(this.firestore, 'nets', netId, 'checkins');
    const docRef = await addDoc(checkinsRef, {
      callsign: data.callsign.toUpperCase(),
      firstName: person?.name?.split(' ')[0] || '',
      assignment: data.assignment || null,
      location: data.location || null,
      notes: data.notes || null,
      mileage: data.mileage || null,
      attributeSnapshot,
      signInTime: serverTimestamp(),
      createdBy: uid,
    });

    return docRef.id;
  }

  /**
   * Update a check-in
   */
  async updateCheckIn(
    netId: string,
    checkinId: string,
    data: Partial<Omit<CheckIn, 'id' | 'signInTime' | 'createdBy'>>
  ): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not signed in');

    const checkinRef = doc(this.firestore, 'nets', netId, 'checkins', checkinId);

    // Clean up undefined values
    const updateData: Record<string, unknown> = {};
    if (data.assignment !== undefined) updateData['assignment'] = data.assignment || null;
    if (data.location !== undefined) updateData['location'] = data.location || null;
    if (data.notes !== undefined) updateData['notes'] = data.notes || null;
    if (data.mileage !== undefined) updateData['mileage'] = data.mileage || null;
    if (data.signOutTime !== undefined) {
      updateData['signOutTime'] = data.signOutTime ? Timestamp.fromDate(data.signOutTime) : null;
    }

    updateData['lastEditedBy'] = uid;
    updateData['lastEditedAt'] = serverTimestamp();

    await updateDoc(checkinRef, updateData);
  }

  /**
   * Sign out a check-in (stamp signOutTime)
   */
  async signOut(netId: string, checkinId: string): Promise<void> {
    await this.updateCheckIn(netId, checkinId, {
      signOutTime: new Date(),
    });
  }

  /**
   * Get check-in by ID from current list
   */
  getCheckIn(checkinId: string): CheckIn | undefined {
    return this._checkins().find((c) => c.id === checkinId);
  }
}
