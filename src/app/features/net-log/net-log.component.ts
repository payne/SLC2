import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NetService, UserService, SyncService } from '../../core';

@Component({
  selector: 'app-net-log',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './net-log.component.html',
  styleUrl: './net-log.component.scss',
})
export class NetLogComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  netService = inject(NetService);
  userService = inject(UserService);
  syncService = inject(SyncService);

  private presenceInterval: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    const netId = this.route.snapshot.paramMap.get('id');
    if (netId) {
      try {
        await this.netService.loadNet(netId);
        this.startPresenceHeartbeat(netId);
      } catch (error) {
        console.error('Error loading net:', error);
        this.router.navigate(['/']);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPresenceHeartbeat();
  }

  private startPresenceHeartbeat(netId: string): void {
    // Update presence immediately
    this.netService.updatePresence(netId);

    // Then every 20 seconds
    this.presenceInterval = setInterval(() => {
      this.netService.updatePresence(netId);
    }, 20000);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  leaveNet(): void {
    this.stopPresenceHeartbeat();
    this.netService.leaveNet();
    this.router.navigate(['/']);
  }
}
