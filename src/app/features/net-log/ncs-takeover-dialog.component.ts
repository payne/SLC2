import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

interface DialogData {
  currentNcsCallsign: string;
  isStale: boolean;
}

@Component({
  selector: 'app-ncs-takeover-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      @if (data.isStale) {
        Take Over as Net Controller
      } @else {
        Confirm NCS Takeover
      }
    </h2>

    <mat-dialog-content>
      @if (data.isStale) {
        <p>
          <strong>{{ data.currentNcsCallsign }}</strong> appears to be offline
          (no activity in the last 60 seconds).
        </p>
        <p>Would you like to take over as Net Controller?</p>
      } @else {
        <div class="warning">
          <mat-icon>warning</mat-icon>
          <p>
            <strong>{{ data.currentNcsCallsign }}</strong> is currently the active
            Net Controller.
          </p>
        </div>
        <p>
          Are you sure you want to take over? The current NCS will be notified.
        </p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="confirm()">
        @if (data.isStale) {
          Take Over
        } @else {
          Yes, Take Over
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .warning {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: #fff3e0;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;

      mat-icon {
        color: #ef6c00;
      }

      p {
        margin: 0;
      }
    }

    p {
      margin: 0.5rem 0;
    }
  `,
})
export class NcsTakeoverDialogComponent {
  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<NcsTakeoverDialogComponent>);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
