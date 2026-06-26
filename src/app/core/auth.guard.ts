import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from './user.service';

/**
 * Guard that requires user to be authorized (has user document)
 */
export const authGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const accessState = userService.accessState();

  switch (accessState) {
    case 'authorized':
      return true;
    case 'pending-claim':
      return router.createUrlTree(['/claim']);
    case 'no-access':
      return router.createUrlTree(['/no-access']);
    case 'signed-out':
    case 'error':
      return router.createUrlTree(['/sign-in']);
    case 'loading':
    default:
      // Still loading - redirect to sign-in which will redirect back when ready
      return router.createUrlTree(['/sign-in']);
  }
};

/**
 * Guard that requires user to be an inviter or higher
 */
export const inviterGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (!userService.isInviter()) {
    return router.createUrlTree(['/']);
  }

  return true;
};

/**
 * Guard that requires user to be root
 */
export const rootGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (!userService.isRoot()) {
    return router.createUrlTree(['/']);
  }

  return true;
};

/**
 * Guard for sign-in page - redirects if already authorized
 */
export const signInGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const accessState = userService.accessState();

  switch (accessState) {
    case 'authorized':
      return router.createUrlTree(['/']);
    case 'pending-claim':
      return router.createUrlTree(['/claim']);
    case 'signed-out':
    case 'loading':
    case 'error':
    default:
      // Show sign-in page
      return true;
  }
};
