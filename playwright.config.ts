import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration
 * Prerequisites:
 *   - Backend running: docker compose up -d (port 4000)
 *   - Frontend running: npm run dev (port 3001)
 *   - Admin user seeded with email: admin@scanupgo.com / password: admin123
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,     // Sequential to avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Persist admin session across tests in a suite
    storageState: 'tests/e2e/.auth/admin.json',
  },

  projects: [
    // Setup: authenticate admin once before all tests
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { storageState: undefined },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
