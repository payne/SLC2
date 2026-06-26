import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AuthService, UserService, NetService, SyncService } from '../../core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userService = inject(UserService);
  netService = inject(NetService);
  syncService = inject(SyncService);

  joinCode = '';
  errorMessage = '';
  isJoining = false;

  async signOut(): Promise<void> {
    await this.authService.signOutUser();
    this.router.navigate(['/sign-in']);
  }

  async joinNet(): Promise<void> {
    if (!this.joinCode.trim()) {
      this.errorMessage = 'Please enter a join code';
      return;
    }

    this.isJoining = true;
    this.errorMessage = '';

    try {
      const netId = await this.netService.joinNet(this.joinCode);
      this.router.navigate(['/net', netId]);
    } catch (error) {
      console.error('Error joining net:', error);
      this.errorMessage = 'Invalid join code or net is closed';
    } finally {
      this.isJoining = false;
    }
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
