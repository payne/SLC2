import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Net Log page
 */
export class NetLogPage {
  readonly page: Page;

  // Header elements
  readonly headerNcs: Locator;
  readonly headerBackup: Locator;
  readonly shareCode: Locator;
  readonly syncStatus: Locator;
  readonly clock: Locator;
  readonly presenceButton: Locator;

  // Entry row (for writers)
  readonly callsignInput: Locator;
  readonly assignmentInput: Locator;
  readonly locationInput: Locator;
  readonly notesInput: Locator;
  readonly mileageInput: Locator;
  readonly logButton: Locator;

  // Grid
  readonly grid: Locator;
  readonly gridRows: Locator;

  // Footer
  readonly endNetButton: Locator;
  readonly commentsButton: Locator;
  readonly menuButton: Locator;
  readonly checkinCount: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.headerNcs = page.locator('.header-field:has-text("Net Controller")');
    this.headerBackup = page.locator('.header-field:has-text("Backup Controller")');
    this.shareCode = page.locator('.share-code');
    this.syncStatus = page.locator('.sync-status');
    this.clock = page.locator('app-clock');
    this.presenceButton = page.locator('app-presence-list button');

    // Entry row
    this.callsignInput = page.locator('.entry-row input[matInput]').first();
    this.assignmentInput = page.locator('mat-form-field:has(mat-label:has-text("Assignment")) input');
    this.locationInput = page.locator('mat-form-field:has(mat-label:has-text("Location")) input');
    this.notesInput = page.locator('mat-form-field:has(mat-label:has-text("Notes")) input');
    this.mileageInput = page.locator('mat-form-field:has(mat-label:has-text("Mileage")) input');
    this.logButton = page.locator('.entry-row button:has-text("Log")');

    // Grid
    this.grid = page.locator('.ag-theme-quartz');
    this.gridRows = page.locator('.ag-row');

    // Footer
    this.endNetButton = page.locator('button:has-text("End NET")');
    this.commentsButton = page.locator('.comments-display');
    this.menuButton = page.locator('button:has-text("Menu")');
    this.checkinCount = page.locator('.checkin-count');
  }

  async goto(netId: string): Promise<void> {
    await this.page.goto(`/net/${netId}`);
  }

  async addCheckin(
    callsign: string,
    options?: {
      assignment?: string;
      location?: string;
      notes?: string;
      mileage?: number;
    }
  ): Promise<void> {
    await this.callsignInput.fill(callsign);

    if (options?.assignment) {
      await this.assignmentInput.fill(options.assignment);
    }
    if (options?.location) {
      await this.locationInput.fill(options.location);
    }
    if (options?.notes) {
      await this.notesInput.fill(options.notes);
    }
    if (options?.mileage !== undefined) {
      await this.mileageInput.fill(options.mileage.toString());
    }

    await this.logButton.click();
  }

  async selectFromAutocomplete(callsign: string): Promise<void> {
    await this.callsignInput.fill(callsign);
    await this.page.locator(`mat-option:has-text("${callsign}")`).click();
  }

  async getRowCount(): Promise<number> {
    return await this.gridRows.count();
  }

  async getCheckinCount(): Promise<number> {
    const text = await this.checkinCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getSyncStatus(): Promise<string> {
    return (await this.syncStatus.textContent()) || '';
  }

  async endNet(): Promise<void> {
    await this.endNetButton.click();
    // Confirm the dialog
    await this.page.locator('button:has-text("End"), button:has-text("Yes")').click();
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
  }

  async exportCsv(): Promise<void> {
    await this.openMenu();
    await this.page.locator('button:has-text("Export This Net")').click();
  }

  async isWriterMode(): Promise<boolean> {
    return await this.callsignInput.isVisible();
  }

  async waitForGridLoaded(): Promise<void> {
    await this.grid.waitFor({ state: 'visible' });
  }
}
