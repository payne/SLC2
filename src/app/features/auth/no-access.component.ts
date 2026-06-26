import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './no-access.component.html',
  styleUrl: './no-access.component.scss',
})
export class NoAccessComponent {
  private authService = inject(AuthService);

  email = this.authService.email;

  async signOut(): Promise<void> {
    await this.authService.signOutUser();
  }
}
