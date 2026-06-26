import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  Firestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from '@angular/fire/firestore';

const CONFIRMATION_TEXT = 'DELETE ALL DATA';

@Component({
  selector: 'app-remove-data-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Remove All Data</h2>

    <mat-dialog-content>
      @if (isDeleting()) {
        <div class="deleting">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Deleting data...</p>
        </div>
      } @else {
        <div class="warning">
          <p>
            <strong>Warning:</strong> This action will permanently delete all nets
            and check-ins. This cannot be undone.
          </p>
          <p>Roster data and user accounts will be preserved.</p>
        </div>

        <mat-form-field appearance="outline" class="confirmation-field">
          <mat-label>Type "{{ confirmationText }}" to confirm</mat-label>
          <input
            matInput
            [(ngModel)]="userInput"
            [placeholder]="confirmationText"
            autocomplete="off"
          />
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (!isDeleting()) {
        <button mat-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          color="warn"
          [disabled]="!isConfirmed()"
          (click)="deleteAllData()"
        >
          Delete All Data
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .warning {
      background: #ffebee;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;

      p {
        margin: 0.5rem 0;
        color: #c62828;
      }
    }

    .confirmation-field {
      width: 100%;
    }

    .deleting {
      padding: 2rem;
      text-align: center;

      mat-progress-bar {
        margin-bottom: 1rem;
      }
    }
  `,
})
export class RemoveDataDialogComponent {
  private firestore = inject(Firestore);
  private dialogRef = inject(MatDialogRef<RemoveDataDialogComponent>);

  confirmationText = CONFIRMATION_TEXT;
  userInput = '';
  isDeleting = signal(false);

  isConfirmed(): boolean {
    return this.userInput.trim().toUpperCase() === CONFIRMATION_TEXT;
  }

  async deleteAllData(): Promise<void> {
    if (!this.isConfirmed()) return;

    this.isDeleting.set(true);

    try {
      // Get all nets
      const netsRef = collection(this.firestore, 'nets');
      const netsSnapshot = await getDocs(netsRef);

      for (const netDoc of netsSnapshot.docs) {
        // Delete all check-ins for this net
        const checkinsRef = collection(this.firestore, 'nets', netDoc.id, 'checkins');
        const checkinsSnapshot = await getDocs(checkinsRef);

        // Use batched writes for efficiency
        const batch = writeBatch(this.firestore);
        checkinsSnapshot.docs.forEach((checkinDoc) => {
          batch.delete(checkinDoc.ref);
        });
        await batch.commit();

        // Delete members subcollection
        const membersRef = collection(this.firestore, 'nets', netDoc.id, 'members');
        const membersSnapshot = await getDocs(membersRef);
        const membersBatch = writeBatch(this.firestore);
        membersSnapshot.docs.forEach((memberDoc) => {
          membersBatch.delete(memberDoc.ref);
        });
        await membersBatch.commit();

        // Delete presence subcollection
        const presenceRef = collection(this.firestore, 'nets', netDoc.id, 'presence');
        const presenceSnapshot = await getDocs(presenceRef);
        const presenceBatch = writeBatch(this.firestore);
        presenceSnapshot.docs.forEach((presenceDoc) => {
          presenceBatch.delete(presenceDoc.ref);
        });
        await presenceBatch.commit();

        // Delete the net document
        await deleteDoc(doc(this.firestore, 'nets', netDoc.id));
      }

      this.dialogRef.close({ deleted: true });
    } catch (error) {
      console.error('Error deleting data:', error);
      this.dialogRef.close({ deleted: false, error });
    }
  }

  cancel(): void {
    this.dialogRef.close({ deleted: false });
  }
}
