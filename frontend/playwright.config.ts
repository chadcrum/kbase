import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for KBase e2e tests
 * 
 * This configuration sets up:
 * - Multiple browser projects (chromium, firefox, webkit)
 * - Parallel execution with isolated contexts
 * - Global setup/teardown for backend management
 * - Screenshot/video capture on failure
 * - Retry logic for flaky tests
 * - CI/CD optimized reporters
 */
export default defineConfig({
  // Test directory
  testDir: './e2e/specs',
  
  // Global setup and teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  
  // Test timeout
  timeout: 30 * 1000, // 30 seconds per test
  
  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Number of workers for parallel execution
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ...(process.env.CI ? [['github']] : [['list']])
  ],
  
  // Global test options
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:5173',
    
    // Browser context options
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
    
    // Action timeout
    actionTimeout: 10 * 1000,
  },
  
  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing (optional)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Web server configuration for local development
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for dev server startup
    env: {
      VITE_API_URL: 'http://127.0.0.1:8001',
    },
  },
});
