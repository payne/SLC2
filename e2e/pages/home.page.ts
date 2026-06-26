import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Home page
 */
export class HomePage {
  readonly page: Page;
  readonly joinCodeInput: Locator;
  readonly joinButton: Locator;
  readonly adminLink: Locator;
  readonly rosterLink: Locator;
  readonly userCallsign: Locator;

  constructor(page: Page) {
    this.page = page;
    this.joinCodeInput = page.locator('input[placeholder*="code" i], input[formControlName="joinCode"]');
    this.joinButton = page.locator('button:has-text("Join")');
    this.adminLink = page.locator('a[href="/admin"], button:has-text("Admin")');
    this.rosterLink = page.locator('a[href="/roster"], button:has-text("Roster")');
    this.userCallsign = page.locator('.user-callsign, .callsign-display');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async joinNet(code: string): Promise<void> {
    await this.joinCodeInput.fill(code);
    await this.joinButton.click();
  }

  async navigateToAdmin(): Promise<void> {
    await this.adminLink.click();
  }

  async navigateToRoster(): Promise<void> {
    await this.rosterLink.click();
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.userCallsign.isVisible();
  }
}
