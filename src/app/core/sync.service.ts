import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  onSnapshot,
  enableNetwork,
  disableNetwork,
} from '@angular/fire/firestore';

export type SyncStatus = 'online' | 'offline' | 'pending';

@Injectable({ providedIn: 'root' })
export class SyncService implements OnDestroy {
  private firestore = inject(Firestore);
  private unsubscribe: (() => void) | null = null;

  /** Current sync status */
  private _status = signal<SyncStatus>('online');
  readonly status = this._status.asReadonly();

  /** Number of pending writes */
  private _pendingWrites = signal(0);
  readonly pendingWrites = this._pendingWrites.asReadonly();

  /** Whether currently online */
  readonly isOnline = computed(() => this._status() === 'online');

  /** Whether there are pending writes */
  readonly hasPendingWrites = computed(() => this._pendingWrites() > 0);

  /** Human-readable status text */
  readonly statusText = computed(() => {
    const status = this._status();
    const pending = this._pendingWrites();

    if (status === 'offline') {
      return pending > 0 ? `Offline (${pending} pending)` : 'Offline';
    }
    if (pending > 0) {
      return `Syncing (${pending} pending)`;
    }
    return 'Online';
  });

  /** Status color class for UI */
  readonly statusClass = computed(() => {
    const status = this._status();
    if (status === 'offline') return 'status-offline';
    if (this._pendingWrites() > 0) return 'status-pending';
    return 'status-online';
  });

  constructor() {
    this.initializeStatusListener();
    this.initializeBrowserOnlineListener();
  }

  /**
   * Initialize Firestore snapshot listener to track sync status
   * We use a dummy collection to monitor metadata
   */
  private initializeStatusListener(): void {
    // Listen to any collection to get metadata updates
    // Using 'config' as it's always accessible
    const configRef = collection(this.firestore, 'config');

    this.unsubscribe = onSnapshot(
      configRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        if (fromCache && !navigator.onLine) {
          this._status.set('offline');
        } else if (hasPendingWrites) {
          this._status.set('pending');
        } else {
          this._status.set('online');
        }

        // Count pending writes across all docs
        let pendingCount = 0;
        snapshot.docs.forEach((doc) => {
          if (doc.metadata.hasPendingWrites) {
            pendingCount++;
          }
        });
        this._pendingWrites.set(pendingCount);
      },
      (error) => {
        console.error('Sync status listener error:', error);
        this._status.set('offline');
      }
    );
  }

  /**
   * Listen to browser online/offline events
   */
  private initializeBrowserOnlineListener(): void {
    window.addEventListener('online', () => {
      // Re-enable network when browser comes online
      this.goOnline();
    });

    window.addEventListener('offline', () => {
      this._status.set('offline');
    });

    // Set initial state
    if (!navigator.onLine) {
      this._status.set('offline');
    }
  }

  /**
   * Manually go offline (useful for testing)
   */
  async goOffline(): Promise<void> {
    await disableNetwork(this.firestore);
    this._status.set('offline');
  }

  /**
   * Manually go online
   */
  async goOnline(): Promise<void> {
    await enableNetwork(this.firestore);
    // Status will be updated by the snapshot listener
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
