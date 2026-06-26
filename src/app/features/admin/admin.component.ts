import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService, UserService, NetService } from '../../core';
import { User, Invitation, NET_TYPES, NetType } from '../../shared/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    TitleCasePipe,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  adminService = inject(AdminService);
  userService = inject(UserService);
  netService = inject(NetService);

  // Data
  users = signal<User[]>([]);
  pendingInvitations = signal<Invitation[]>([]);

  // Forms
  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    callsign: ['', [Validators.required, Validators.minLength(3)]],
    level: ['operator' as 'operator' | 'inviter', Validators.required],
  });

  createNetForm = this.fb.group({
    organization: ['', Validators.required],
    netType: ['Training' as NetType, Validators.required],
    band: [''],
    freq: [''],
    notes: [''],
  });

  netTypes = NET_TYPES;

  // State
  isInviting = signal(false);
  isCreatingNet = signal(false);

  userColumns = ['callsign', 'email', 'level', 'actions'];
  inviteColumns = ['callsign', 'email', 'level', 'actions'];

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    try {
      const [users, invites] = await Promise.all([
        this.adminService.getAllUsers(),
        this.adminService.getPendingInvitations(),
      ]);
      this.users.set(users);
      this.pendingInvitations.set(invites);
    } catch (error) {
      console.error('Error loading admin data:', error);
      this.snackBar.open('Failed to load data', 'Dismiss', { duration: 3000 });
    }
  }

  async inviteUser(): Promise<void> {
    if (!this.inviteForm.valid) return;

    this.isInviting.set(true);
    const { email, callsign, level } = this.inviteForm.value;

    try {
      await this.adminService.inviteUser(email!, callsign!, level!);
      this.snackBar.open('Invitation sent', 'Dismiss', { duration: 3000 });
      this.inviteForm.reset({ level: 'operator' });
      await this.loadData();
    } catch (error: unknown) {
      console.error('Error inviting user:', error);
      const message = error instanceof Error ? error.message : 'Failed to send invitation';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    } finally {
      this.isInviting.set(false);
    }
  }

  async promoteUser(user: User): Promise<void> {
    try {
      await this.adminService.promoteUser(user.id);
      this.snackBar.open(`${user.callsign} promoted to inviter`, 'Dismiss', {
        duration: 3000,
      });
      await this.loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to promote user';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    }
  }

  async demoteUser(user: User): Promise<void> {
    try {
      await this.adminService.demoteUser(user.id);
      this.snackBar.open(`${user.callsign} demoted to operator`, 'Dismiss', {
        duration: 3000,
      });
      await this.loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to demote user';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    }
  }

  async removeUser(user: User): Promise<void> {
    if (!confirm(`Remove ${user.callsign}? This will revoke their access.`)) {
      return;
    }

    try {
      await this.adminService.removeUser(user.id);
      this.snackBar.open(`${user.callsign} removed`, 'Dismiss', { duration: 3000 });
      await this.loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove user';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    }
  }

  async revokeInvitation(invite: Invitation): Promise<void> {
    try {
      await this.adminService.revokeInvitation(invite.email);
      this.snackBar.open('Invitation revoked', 'Dismiss', { duration: 3000 });
      await this.loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to revoke invitation';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    }
  }

  async createNet(): Promise<void> {
    if (!this.createNetForm.valid) return;

    this.isCreatingNet.set(true);
    const formValue = this.createNetForm.value;

    try {
      const netId = await this.netService.createNet({
        organization: formValue.organization!,
        netType: formValue.netType!,
        band: formValue.band || undefined,
        freq: formValue.freq || undefined,
        notes: formValue.notes || undefined,
      });
      this.snackBar.open('Net created', 'Dismiss', { duration: 3000 });
      this.router.navigate(['/net', netId]);
    } catch (error: unknown) {
      console.error('Error creating net:', error);
      const message = error instanceof Error ? error.message : 'Failed to create net';
      this.snackBar.open(message, 'Dismiss', {
        duration: 3000,
      });
    } finally {
      this.isCreatingNet.set(false);
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
