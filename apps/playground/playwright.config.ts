import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // 5199 + strictPort: 5173 is Vite's default and gets stolen by sibling projects on this
  // machine (xenolith-apk-editor), which `reuseExistingServer` then happily tests against.
  webServer: {
    command: 'pnpm exec vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // WebKit/Safari runs locally only — GitHub Actions Linux runners have no WebKit deps.
    ...(process.env.CI ? [] : [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }]),
  ],
})
