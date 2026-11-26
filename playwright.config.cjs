const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: require.resolve('./tests/e2e/setup.cjs'),
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' },
    },
  ],
});
