import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration
 *
 * The site is built with base: '/wayne-nolette/' for GitHub Pages.
 * We serve from a prepared directory structure.
 */

// Allow PORT override via environment variable (validated as numeric)
const PORT = parseInt(String(process.env.PORT), 10) || 4321;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html', { open: 'never' }]],
  use: {
    // Base URL includes the /wayne-nolette/ path prefix
    baseURL: `http://localhost:${PORT}/wayne-nolette`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro 11'] },
    },
    // Mobile devices
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Create temp structure and serve with explicit port
    command: `rm -rf .playwright-serve && mkdir -p .playwright-serve/wayne-nolette && cp -r dist/* .playwright-serve/wayne-nolette/ && npx serve .playwright-serve -p ${PORT} --no-clipboard`,
    url: `http://localhost:${PORT}/wayne-nolette/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
