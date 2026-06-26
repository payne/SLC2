import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration with two projects:
 * - e2e: Fast tests with video on failure
 * - training-videos: Slow-motion tests that produce demo recordings
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'e2e',
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
      },
    },
    {
      name: 'training-videos',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        launchOptions: {
          slowMo: 500, // Slow motion for training recordings
        },
        viewport: { width: 1920, height: 1080 }, // Large viewport for clarity
      },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
