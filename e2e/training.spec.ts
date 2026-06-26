import { test, expect } from '@playwright/test';
import { HomePage, NetLogPage } from './pages';
import { testNet, sampleCheckins } from './fixtures/test-data';

/**
 * Training video tests
 * These run with slowMo and video recording to produce demo/training materials
 *
 * Run with: npx playwright test --project=training-videos
 */
test.describe('Training Videos', () => {
  test.describe.configure({ mode: 'serial' });

  test('Demo: Logging check-ins', async ({ page }) => {
    const netLogPage = new NetLogPage(page);

    // Step 1: Navigate to the app
    await page.goto('/');
    await page.waitForTimeout(1000); // Pause for narration

    // Check if we can access an active net
    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      // Show the home screen for demo purposes
      await expect(page.locator('body')).toBeVisible();
      return;
    }

    // Step 2: Enter an active net
    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();
    await page.waitForTimeout(1500); // Pause to show the grid

    // Step 3: Show the header with NCS info and share code
    await expect(netLogPage.shareCode).toBeVisible();
    await page.waitForTimeout(1000);

    // Step 4: If writer, demonstrate adding a check-in
    if (await netLogPage.isWriterMode()) {
      // Type a callsign (slowly for visibility)
      await netLogPage.callsignInput.fill('KB0');
      await page.waitForTimeout(500);
      await netLogPage.callsignInput.fill('KB0ABC');
      await page.waitForTimeout(1000);

      // Fill in additional fields
      await netLogPage.assignmentInput.fill('Shadow NCS');
      await page.waitForTimeout(500);
      await netLogPage.locationInput.fill('City Hall');
      await page.waitForTimeout(500);
      await netLogPage.notesInput.fill('Training exercise');
      await page.waitForTimeout(500);

      // Log the check-in
      await netLogPage.logButton.click();
      await page.waitForTimeout(1500);
    }

    // Step 5: Show the presence list
    if (await netLogPage.presenceButton.isVisible()) {
      await netLogPage.presenceButton.click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
    }

    // Step 6: Show the footer menu
    await netLogPage.openMenu();
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');

    // Final pause
    await page.waitForTimeout(1000);
  });

  test('Demo: Using the column chooser', async ({ page }) => {
    const netLogPage = new NetLogPage(page);

    await page.goto('/');

    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      return;
    }

    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();
    await page.waitForTimeout(1000);

    // Look for column chooser button
    const columnChooser = page.locator('app-column-chooser button, button:has-text("Columns")');
    if (await columnChooser.isVisible()) {
      await columnChooser.click();
      await page.waitForTimeout(1500);

      // Toggle a checkbox if visible
      const checkbox = page.locator('mat-checkbox').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(1000);
        await checkbox.click();
        await page.waitForTimeout(1000);
      }

      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(1000);
  });

  test('Demo: Mobile responsive view', async ({ page }) => {
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForTimeout(1000);

    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      return;
    }

    await page.locator('[href^="/net/"]').first().click();
    await page.waitForTimeout(2000);

    // Show the mobile card view
    const mobileViewer = page.locator('app-mobile-viewer');
    if (await mobileViewer.isVisible()) {
      // Scroll through some cards
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(1000);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(1000);
  });

  test('Demo: Adjustable clock', async ({ page }) => {
    const netLogPage = new NetLogPage(page);

    await page.goto('/');

    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      return;
    }

    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();
    await page.waitForTimeout(1000);

    // Find and interact with the clock
    const clock = page.locator('app-clock');
    if (await clock.isVisible()) {
      await clock.click();
      await page.waitForTimeout(1500);

      // Look for clock settings
      const settings = page.locator('.clock-settings, mat-menu');
      if (await settings.isVisible()) {
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
      }
    }

    await page.waitForTimeout(1000);
  });

  test('Demo: Export functionality', async ({ page }) => {
    const netLogPage = new NetLogPage(page);

    await page.goto('/');

    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      return;
    }

    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();
    await page.waitForTimeout(1000);

    // Open the menu
    await netLogPage.openMenu();
    await page.waitForTimeout(1500);

    // Highlight export options (don't actually click to avoid downloads)
    const exportOption = page.locator('button:has-text("Export")').first();
    if (await exportOption.isVisible()) {
      await exportOption.hover();
      await page.waitForTimeout(1000);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });
});
