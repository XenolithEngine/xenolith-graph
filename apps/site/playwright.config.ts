import { defineConfig, devices } from '@playwright/test'

// Site e2e — verifies the embedded demos on the docs site actually work end-to-end
// (clicks reach their handlers, canvas mounts, panels are interactive). This is the
// gate we promised user after "panel not clickable" regression.

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev -- --port 4321',
    url: 'http://localhost:4321/',
    reuseExistingServer: !process.env.CI,
    // 120s: the Astro DEV server's cold boot competes with the four sibling e2e suites during
    // the full `pnpm -w test:e2e` run and regularly exceeds 60s there (fine isolated). Not a
    // product regression — same hardening rule as the canvas-visible timeout in the spec.
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
