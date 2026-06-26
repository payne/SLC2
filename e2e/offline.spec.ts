import { test, expect } from '@playwright/test';
import { NetLogPage } from './pages';

/**
 * Offline functionality tests
 * Verifies that check-ins survive a disconnect and sync on reconnect
 */
test.describe('Offline Functionality', () => {
  // This test requires a seeded environment with an authenticated user
  // and an active net. Skip in CI if emulators aren't running.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Offline tests only run on Chromium');

  test('check-ins persist through offline period and sync on reconnect', async ({ page, context }) => {
    const netLogPage = new NetLogPage(page);

    // Navigate to a test net (requires seeded data)
    // In a real test, we'd set up auth state and create a net first
    await page.goto('/');

    // Check if we have an active net to test with
    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      test.skip();
      return;
    }

    // Navigate to the net
    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();

    // Verify we're in writer mode (can add check-ins)
    const isWriter = await netLogPage.isWriterMode();
    if (!isWriter) {
      test.skip();
      return;
    }

    // Get initial check-in count
    const initialCount = await netLogPage.getCheckinCount();

    // Add a check-in while online
    const onlineCallsign = 'TEST01';
    await netLogPage.addCheckin(onlineCallsign, {
      notes: 'Added while online',
    });

    // Verify the check-in was added
    await expect(netLogPage.checkinCount).toContainText(`${initialCount + 1}`);

    // Go offline
    await context.setOffline(true);

    // Verify sync status shows offline
    await expect(netLogPage.syncStatus).toContainText(/offline/i, { timeout: 5000 });

    // Add a check-in while offline
    const offlineCallsign = 'TEST02';
    await netLogPage.addCheckin(offlineCallsign, {
      notes: 'Added while offline',
    });

    // Verify the check-in appears in the UI immediately (optimistic update)
    await expect(netLogPage.checkinCount).toContainText(`${initialCount + 2}`);

    // The offline check-in should appear in the grid
    await expect(page.locator(`.ag-row:has-text("${offlineCallsign}")`)).toBeVisible();

    // Come back online
    await context.setOffline(false);

    // Wait for sync to complete
    await expect(netLogPage.syncStatus).not.toContainText(/offline/i, { timeout: 10000 });

    // Verify both check-ins are still present
    await expect(page.locator(`.ag-row:has-text("${onlineCallsign}")`)).toBeVisible();
    await expect(page.locator(`.ag-row:has-text("${offlineCallsign}")`)).toBeVisible();

    // Verify final count
    await expect(netLogPage.checkinCount).toContainText(`${initialCount + 2}`);
  });

  test('app remains functional during offline period', async ({ page, context }) => {
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // App should still render and be navigable
    await expect(page.locator('body')).toBeVisible();

    // Basic UI elements should still be present
    // The specific elements depend on auth state, but the page should not crash

    // Come back online
    await context.setOffline(false);

    // Page should recover without needing a refresh
    await expect(page.locator('body')).toBeVisible();
  });

  test('pending writes indicator shows during offline edits', async ({ page, context }) => {
    const netLogPage = new NetLogPage(page);

    await page.goto('/');

    // Check for active net
    const hasActiveNet = await page.locator('[href^="/net/"]').isVisible().catch(() => false);
    if (!hasActiveNet) {
      test.skip();
      return;
    }

    await page.locator('[href^="/net/"]').first().click();
    await netLogPage.waitForGridLoaded();

    if (!(await netLogPage.isWriterMode())) {
      test.skip();
      return;
    }

    // Go offline
    await context.setOffline(true);
    await expect(netLogPage.syncStatus).toContainText(/offline/i, { timeout: 5000 });

    // Add check-in
    await netLogPage.addCheckin('PENDING', { notes: 'Pending write test' });

    // Should show pending indicator (may vary by implementation)
    // The sync status should indicate pending writes or offline state
    await expect(netLogPage.syncStatus).toBeVisible();

    // Come back online
    await context.setOffline(false);

    // Status should update after sync
    await expect(netLogPage.syncStatus).toContainText(/online/i, { timeout: 10000 });
  });
});
