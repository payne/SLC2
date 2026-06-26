import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, UserService } from '../../core';
import { Invitation } from '../../shared/models';

@Component({
  selector: 'app-claim-invitation',
  standalone: true,
  imports: [
    TitleCasePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './claim-invitation.component.html',
  styleUrl: './claim-invitation.component.scss',
})
export class ClaimInvitationComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  invitation = signal<Invitation | null>(null);
  isLoading = signal(true);
  isClaiming = signal(false);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const invite = await this.userService.getPendingInvitation();
      this.invitation.set(invite);
    } catch (error) {
      console.error('Error loading invitation:', error);
      this.errorMessage.set('Failed to load invitation details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async claimInvitation(): Promise<void> {
    this.isClaiming.set(true);
    this.errorMessage.set('');

    try {
      await this.userService.claimInvitation();
      // Refresh user data will redirect automatically
    } catch (error) {
      console.error('Error claiming invitation:', error);
      this.errorMessage.set('Failed to claim invitation. Please try again.');
    } finally {
      this.isClaiming.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOutUser();
  }
}
