import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, UserService } from '../../core';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  async signInWithGoogle(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithGoogle();
      // Navigation will be handled by app component based on access state
    } catch (error) {
      console.error('Sign in error:', error);
      this.errorMessage = 'Sign in failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
