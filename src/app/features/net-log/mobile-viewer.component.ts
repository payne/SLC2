import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { CheckIn } from '../../shared/models/checkin.model';
import { AttributeColumnDef } from '../../shared/models/config.model';

@Component({
  selector: 'app-mobile-viewer',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, MatIconModule, DatePipe],
  template: `
    <div class="mobile-viewer">
      @if (checkins.length === 0) {
        <div class="empty-state">
          <mat-icon>radio</mat-icon>
          <p>No check-ins yet</p>
          <p class="hint">Check-ins will appear here as they are logged</p>
        </div>
      } @else {
        @for (checkin of checkins; track checkin.id) {
          <mat-card class="checkin-card">
            <mat-card-header>
              <mat-card-title class="callsign">{{ checkin.callsign }}</mat-card-title>
              <mat-card-subtitle>
                {{ checkin.firstName }}
                @if (checkin.signOutTime) {
                  <span class="signed-out">(Signed Out)</span>
                }
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              @if (checkin.assignment || checkin.location) {
                <div class="info-row">
                  @if (checkin.assignment) {
                    <span class="info-item">
                      <mat-icon>assignment</mat-icon>
                      {{ checkin.assignment }}
                    </span>
                  }
                  @if (checkin.location) {
                    <span class="info-item">
                      <mat-icon>location_on</mat-icon>
                      {{ checkin.location }}
                    </span>
                  }
                </div>
              }

              @if (checkin.notes) {
                <p class="notes">{{ checkin.notes }}</p>
              }

              <div class="attributes">
                @for (col of attributeColumns; track col.column) {
                  @if (getAttributeValue(checkin, col.column)) {
                    <mat-chip>
                      {{ col.header }}:
                      @if (col.type === 'boolean') {
                        <mat-icon>check</mat-icon>
                      } @else {
                        {{ getAttributeValue(checkin, col.column) }}
                      }
                    </mat-chip>
                  }
                }
              </div>

              <div class="times">
                <span class="time">
                  <mat-icon>login</mat-icon>
                  {{ checkin.signInTime | date:'shortTime' }}
                </span>
                @if (checkin.signOutTime) {
                  <span class="time">
                    <mat-icon>logout</mat-icon>
                    {{ checkin.signOutTime | date:'shortTime' }}
                  </span>
                }
                @if (checkin.mileage) {
                  <span class="time">
                    <mat-icon>directions_car</mat-icon>
                    {{ checkin.mileage }} mi
                  </span>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: `
    .mobile-viewer {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: rgba(0, 0, 0, 0.5);

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        margin-bottom: 1rem;
      }

      p {
        margin: 0.25rem 0;
      }

      .hint {
        font-size: 0.875rem;
      }
    }

    .checkin-card {
      mat-card-title.callsign {
        font-family: monospace;
        font-size: 1.25rem;
        color: #1a237e;
      }

      .signed-out {
        color: #4caf50;
        font-size: 0.75rem;
      }
    }

    .info-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.5rem;

      .info-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
          color: rgba(0, 0, 0, 0.5);
        }
      }
    }

    .notes {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.7);
      margin: 0.5rem 0;
    }

    .attributes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.5rem 0;

      mat-chip {
        font-size: 0.75rem;
      }
    }

    .times {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.5);

      .time {
        display: flex;
        align-items: center;
        gap: 0.25rem;

        mat-icon {
          font-size: 0.875rem;
          width: 0.875rem;
          height: 0.875rem;
        }
      }
    }
  `,
})
export class MobileViewerComponent {
  @Input() checkins: CheckIn[] = [];
  @Input() attributeColumns: AttributeColumnDef[] = [];

  getAttributeValue(checkin: CheckIn, column: string): unknown {
    return checkin.attributeSnapshot[column as keyof typeof checkin.attributeSnapshot];
  }
}
