import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.POKER_WEB_RESULTS ?? 'test-results',
  timeout: 60000,
  expect: { timeout: 20000 },
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.POKER_WEB_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.POKER_WEB_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 0.0.0.0 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
      },
})
