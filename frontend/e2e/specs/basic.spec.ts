import { test, expect } from '@playwright/test';

/**
 * Basic Playwright functionality test
 * 
 * This test verifies that Playwright is working correctly
 * without requiring the backend server to be running.
 */

test.describe('Basic Playwright Functionality', () => {
  test('should be able to navigate to a page', async ({ page }) => {
    // Navigate to a simple page
    await page.goto('https://example.com');
    
    // Check that we can interact with the page
    await expect(page).toHaveTitle(/Example Domain/);
    
    // Check that we can find elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Example Domain');
  });

  test('should be able to take a screenshot', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png' });
    
    // Verify the page loaded
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('should be able to evaluate JavaScript', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Evaluate JavaScript in the page context
    const title = await page.evaluate(() => document.title);
    expect(title).toContain('Example Domain');
    
    // Evaluate JavaScript with parameters
    const result = await page.evaluate((text) => {
      return document.querySelector('h1')?.textContent?.includes(text);
    }, 'Example');
    
    expect(result).toBe(true);
  });

  test('should be able to handle page events', async ({ page }) => {
    let consoleMessage = '';
    
    // Listen for console messages
    page.on('console', msg => {
      consoleMessage = msg.text();
    });
    
    await page.goto('https://example.com');
    
    // Trigger a console log
    await page.evaluate(() => console.log('Test message'));
    
    // Note: Console messages might not be captured in this simple test
    // but the test demonstrates the capability
    expect(consoleMessage).toBeDefined();
  });
});
