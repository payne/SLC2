import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { NetService } from '../../core';
import { NetPresence } from '../../shared/models/net.model';

@Component({
  selector: 'app-presence-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="presenceMenu"
      [matTooltip]="'Viewers: ' + activeViewers().length"
    >
      <mat-icon [matBadge]="activeViewers().length" matBadgeSize="small">
        people
      </mat-icon>
    </button>

    <mat-menu #presenceMenu="matMenu" class="presence-menu">
      <div class="menu-header">
        <strong>Active Viewers ({{ activeViewers().length }})</strong>
      </div>

      @if (activeViewers().length === 0) {
        <div class="empty">
          <span>No other viewers</span>
        </div>
      } @else {
        @for (viewer of activeViewers(); track viewer.id) {
          <button
            mat-menu-item
            [disabled]="!canAssignBackup || viewer.id === currentNcs"
            (click)="assignBackup.emit(viewer.id)"
          >
            <mat-icon>person</mat-icon>
            <span class="callsign">{{ viewer.callsign || viewer.id.substring(0, 8) + '...' }}</span>
            @if (viewer.id === currentNcs) {
              <mat-chip class="role-chip">NCS</mat-chip>
            } @else if (viewer.id === currentBackup) {
              <mat-chip class="role-chip backup">Backup</mat-chip>
            }
          </button>
        }
      }

      @if (canAssignBackup && currentBackup) {
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="assignBackup.emit(null)">
          <mat-icon>person_remove</mat-icon>
          Remove Backup Controller
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .menu-header {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .empty {
      padding: 1rem;
      color: rgba(0, 0, 0, 0.5);
      font-style: italic;
    }

    .callsign {
      font-family: monospace;
      font-weight: 600;
    }

    .role-chip {
      font-size: 0.625rem;
      height: 20px;
      margin-left: auto;

      &.backup {
        background: #fff3e0;
      }
    }
  `,
})
export class PresenceListComponent implements OnInit, OnDestroy {
  @Input() netId = '';
  @Input() currentNcs = '';
  @Input() currentBackup?: string;
  @Input() canAssignBackup = false;
  @Output() assignBackup = new EventEmitter<string | null>();

  private netService = inject(NetService);
  private subscription: Subscription | null = null;

  presence = signal<NetPresence[]>([]);

  activeViewers = () => {
    const now = Date.now();
    const staleThreshold = 60 * 1000; // 60 seconds

    return this.presence().filter((p) => {
      if (!p.lastSeen) return false;
      return now - p.lastSeen.getTime() < staleThreshold;
    });
  };

  ngOnInit(): void {
    if (this.netId) {
      this.subscription = this.netService
        .getPresenceObservable(this.netId)
        .subscribe((presence) => {
          this.presence.set(presence);
        });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
