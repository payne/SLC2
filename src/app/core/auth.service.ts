import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  user,
  User as FirebaseUser,
} from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private googleProvider = new GoogleAuthProvider();

  /** Current Firebase Auth user (null if not signed in) */
  readonly firebaseUser = toSignal(user(this.auth), { initialValue: null });

  /** Whether authentication state is still loading */
  readonly isLoading = signal(true);

  /** Current user's UID */
  readonly uid = computed(() => this.firebaseUser()?.uid ?? null);

  /** Current user's email */
  readonly email = computed(() => this.firebaseUser()?.email ?? null);

  /** Whether user is signed in to Firebase Auth */
  readonly isSignedIn = computed(() => !!this.firebaseUser());

  constructor() {
    // Mark loading complete once we get the first auth state
    const unsubscribe = this.auth.onAuthStateChanged(() => {
      this.isLoading.set(false);
      unsubscribe();
    });
  }

  /**
   * Sign in with Google
   * Uses popup on desktop, redirect on mobile for better UX
   */
  async signInWithGoogle(): Promise<FirebaseUser | null> {
    try {
      // Use popup for desktop, redirect for mobile/PWA
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        await signInWithRedirect(this.auth, this.googleProvider);
        return null; // Redirect will reload the page
      } else {
        const result = await signInWithPopup(this.auth, this.googleProvider);
        return result.user;
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOutUser(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }
}
