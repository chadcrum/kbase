import { defineConfig, devices } from '@playwright/test';

/**
 * Basic Playwright configuration for testing without backend
 * 
 * This configuration is used to verify Playwright functionality
 * without requiring the backend server to be running.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e/specs',
  
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
  ],
});
