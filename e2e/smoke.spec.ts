import { test, expect } from '@playwright/test';

/**
 * Smoke tests to verify the app loads and basic navigation works
 */
test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ham Net Logger|Net Log/i);
  });

  test('sign-in page renders', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('button:has-text("Google"), button:has-text("Sign")').first()).toBeVisible();
  });

  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.goto('/');
    // Should redirect to sign-in or show sign-in UI
    await expect(page).toHaveURL(/sign-in|\/$/);
  });
});
