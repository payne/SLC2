import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Sign In page
 */
export class SignInPage {
  readonly page: Page;
  readonly googleSignInButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.googleSignInButton = page.locator('button:has-text("Sign in with Google"), button:has-text("Google")');
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/sign-in');
  }

  /**
   * Sign in using Firebase Emulator UI
   * In emulator mode, we can auto-sign-in without actual Google OAuth
   */
  async signInWithEmulator(email: string): Promise<void> {
    // The emulator allows direct sign-in without OAuth
    // This method handles the emulator-specific auth flow
    await this.googleSignInButton.click();

    // In emulator popup, fill email
    const popup = await this.page.waitForEvent('popup');
    await popup.locator('input[type="email"]').fill(email);
    await popup.locator('button[type="submit"], button:has-text("Sign in")').click();
    await popup.waitForEvent('close');
  }

  /**
   * Wait for redirect after successful sign-in
   */
  async waitForSignIn(): Promise<void> {
    await this.page.waitForURL(url => !url.pathname.includes('sign-in'), {
      timeout: 10000,
    });
  }
}
