import { Routes } from '@angular/router';
import { authGuard, signInGuard, inviterGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'sign-in',
    canActivate: [signInGuard],
    loadComponent: () =>
      import('./features/auth/sign-in.component').then(
        (m) => m.SignInComponent
      ),
  },
  {
    path: 'claim',
    loadComponent: () =>
      import('./features/auth/claim-invitation.component').then(
        (m) => m.ClaimInvitationComponent
      ),
  },
  {
    path: 'no-access',
    loadComponent: () =>
      import('./features/auth/no-access.component').then(
        (m) => m.NoAccessComponent
      ),
  },
  {
    path: 'admin',
    canActivate: [authGuard, inviterGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'net/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/net-log/net-log.component').then(
        (m) => m.NetLogComponent
      ),
  },
  {
    path: 'roster',
    canActivate: [authGuard, inviterGuard],
    loadComponent: () =>
      import('./features/roster/roster.component').then(
        (m) => m.RosterComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
