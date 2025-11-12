import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when retrying with failures */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 10000,
  },

  /* Global timeout for each test */
  timeout: 30000,

  /* Global setup and teardown */
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: './tests/e2e/storage-state.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: './tests/e2e/storage-state.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: './tests/e2e/storage-state.json',
      },
      dependencies: ['setup'],
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: './tests/e2e/storage-state.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: './tests/e2e/storage-state.json',
      },
      dependencies: ['setup'],
    },

    /* API Testing */
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.js',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
      },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd backend && npm start',
      port: 3001,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'test_db',
        DB_USER: 'test_user',
        DB_PASSWORD: 'test_password',
        REDIS_URL: 'redis://localhost:6379',
        ACCESS_TOKEN_SECRET: 'test-access-secret-for-e2e-testing-32-chars',
        REFRESH_TOKEN_SECRET: 'test-refresh-secret-for-e2e-testing-32-chars',
        ENABLE_VIRUS_SCANNER: 'false',
      },
    },
    {
      command: 'cd frontend-web && npm start',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        REACT_APP_API_URL: 'http://localhost:3001/api',
        REACT_APP_DEMO_MODE: 'false',
      },
    },
  ],

  /* Test output directory */
  outputDir: './test-results',

  /* Maximum time one test can run for. */
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 10000,
  },
});