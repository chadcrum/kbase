import { test, expect } from '@playwright/test';

/**
 * Setup verification test
 * 
 * This test verifies that the e2e test infrastructure is working correctly
 * before running the main authentication test suite.
 */

test.describe('E2E Test Setup', () => {
  test('should have backend server running', async ({ page }) => {
    // Check if backend is accessible
    const backendUrl = process.env.TEST_BACKEND_URL || 'http://localhost:8001';
    
    try {
      const response = await page.request.get(`${backendUrl}/health`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
    } catch (error) {
      throw new Error(`Backend server not accessible at ${backendUrl}. Make sure the backend is running.`);
    }
  });

  test('should have frontend server running', async ({ page }) => {
    // Check if frontend is accessible
    await page.goto('/');
    
    // Should either show login page or redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/.*\/(login)?$/);
  });

  test('should have test vault configured', async () => {
    const vaultPath = process.env.TEST_VAULT_PATH;
    expect(vaultPath).toBeTruthy();
    
    // Check if vault path exists (this would be set by global setup)
    expect(vaultPath).toContain('kbase-test-vault');
  });

  test('should have test environment variables set', async () => {
    expect(process.env.TEST_BACKEND_URL).toBeTruthy();
    expect(process.env.TEST_VAULT_PATH).toBeTruthy();
    expect(process.env.TEST_SECRET_KEY).toBeTruthy();
    expect(process.env.TEST_PASSWORD).toBeTruthy();
  });
});
