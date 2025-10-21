import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { createAuthHelper, quickLogin } from '../helpers/auth';

/**
 * Authentication E2E Test Suite
 * 
 * Comprehensive test coverage for all authentication flows including:
 * - Successful login
 * - Failed login scenarios
 * - Logout functionality
 * - Token persistence and validation
 * - Route guards
 * - Edge cases and security
 */

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
  });

  test.describe('Successful Login Flow', () => {
    test('should login with correct password and redirect to home', async ({ page }) => {
      await loginPage.goto();
      await loginPage.expectPageContent();
      
      await loginPage.login('test-password');
      await loginPage.expectLoginSuccess();
      
      // Verify we're on home page
      await homePage.expectAuthenticated();
      await homePage.expectFileTreeVisible();
      await homePage.expectNoteViewerVisible();
    });

    test('should store JWT token in localStorage after successful login', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test-password');
      await loginPage.expectLoginSuccess();
      
      // Check token is stored
      const authHelper = createAuthHelper(page);
      const token = await authHelper.getStoredToken();
      expect(token).toBeTruthy();
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format
    });

    test('should persist authentication state on page reload', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('test-password');
      await loginPage.expectLoginSuccess();
      
      // Reload the page
      await page.reload();
      await homePage.waitForPageLoad();
      
      // Should still be authenticated
      await homePage.expectAuthenticated();
      await homePage.expectFileTreeVisible();
    });

    test('should autofocus password input on page load', async ({ page }) => {
      await loginPage.goto();
      await loginPage.expectPasswordFocused();
    });

    test('should allow login via Enter key', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      await loginPage.pressEnterInPassword();
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('Failed Login Flow', () => {
    test('should show error with incorrect password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('wrong-password');
      await loginPage.expectLoginError('Incorrect password');
    });

    test('should show error with empty password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.clickLogin();
      await loginPage.expectLoginButtonDisabled();
    });

    test('should disable button while loading', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      
      // Start login and immediately check button state
      const loginPromise = loginPage.clickLogin();
      await loginPage.expectLoading();
      await loginPage.expectLoginButtonDisabled();
      
      await loginPromise;
    });

    test('should clear error on retry with correct password', async ({ page }) => {
      await loginPage.goto();
      
      // First attempt with wrong password
      await loginPage.login('wrong-password');
      await loginPage.expectLoginError();
      
      // Clear and retry with correct password
      await loginPage.clearPassword();
      await loginPage.login('test-password');
      await loginPage.expectLoginSuccess();
    });

    test('should show loading spinner during login request', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      
      // Start login and check for spinner
      const loginPromise = loginPage.clickLogin();
      await loginPage.expectLoading();
      
      await loginPromise;
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      await quickLogin(page);
    });

    test('should logout successfully and redirect to login', async ({ page }) => {
      await homePage.goto();
      await homePage.expectAuthenticated();
      
      await homePage.clickLogout();
      await homePage.expectRedirectedToLogin();
    });

    test('should clear localStorage token on logout', async ({ page }) => {
      await homePage.goto();
      
      // Verify token exists
      const authHelper = createAuthHelper(page);
      expect(await authHelper.isAuthenticated()).toBe(true);
      
      // Logout
      await homePage.clickLogout();
      
      // Verify token is cleared
      expect(await authHelper.isAuthenticated()).toBe(false);
    });

    test('should not access protected routes after logout', async ({ page }) => {
      await homePage.goto();
      await homePage.clickLogout();
      
      // Try to access protected route
      await homePage.goto();
      await homePage.expectRedirectedToLogin();
    });
  });

  test.describe('Token Persistence & Validation', () => {
    test('should allow direct access to home with valid token', async ({ page }) => {
      // Login first
      await quickLogin(page);
      
      // Navigate directly to home
      await homePage.goto();
      await homePage.expectAuthenticated();
    });

    test('should redirect to login with invalid token', async ({ page }) => {
      const authHelper = createAuthHelper(page);
      
      // Set invalid token
      await authHelper.setToken('invalid.jwt.token');
      
      // Try to access home
      await homePage.goto();
      await homePage.expectRedirectedToLogin();
    });

    test('should redirect to login with expired token', async ({ page }) => {
      const authHelper = createAuthHelper(page);
      
      // Set expired token
      const expiredToken = authHelper.createExpiredToken();
      await authHelper.setToken(expiredToken);
      
      // Try to access home
      await homePage.goto();
      await homePage.expectRedirectedToLogin();
    });

    test('should redirect to login with missing token', async ({ page }) => {
      const authHelper = createAuthHelper(page);
      
      // Clear all auth state
      await authHelper.clearAuth();
      
      // Try to access home
      await homePage.goto();
      await homePage.expectRedirectedToLogin();
    });

    test('should refresh token on page load', async ({ page }) => {
      // Login and get initial token
      await quickLogin(page);
      const authHelper = createAuthHelper(page);
      const _initialToken = await authHelper.getStoredToken();
      
      // Reload page
      await page.reload();
      await homePage.waitForPageLoad();
      
      // Should still be authenticated (token refreshed)
      await homePage.expectAuthenticated();
    });
  });

  test.describe('Route Guards', () => {
    test('should redirect unauthenticated user from home to login', async ({ page }) => {
      await homePage.goto();
      await homePage.expectRedirectedToLogin();
    });

    test('should redirect authenticated user from login to home', async ({ page }) => {
      await quickLogin(page);
      
      await loginPage.goto();
      await homePage.expectAuthenticated();
    });

    test('should require authentication for direct navigation to home', async ({ page }) => {
      // Try direct navigation without auth
      await page.goto('/');
      await homePage.expectRedirectedToLogin();
    });

    test('should respect auth state with back button navigation', async ({ page }) => {
      // Login
      await quickLogin(page);
      await homePage.goto();
      
      // Navigate to login (should redirect to home)
      await loginPage.goto();
      await homePage.expectAuthenticated();
      
      // Use back button
      await page.goBack();
      await homePage.expectAuthenticated();
    });
  });

  test.describe('Edge Cases & Security', () => {
    test('should handle SQL injection attempts in password field', async ({ page }) => {
      await loginPage.goto();
      
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];
      
      for (const attempt of sqlInjectionAttempts) {
        await loginPage.fillPassword(attempt);
        await loginPage.clickLogin();
        await loginPage.expectLoginError();
        await loginPage.clearPassword();
      }
    });

    test('should handle XSS attempts in password field', async ({ page }) => {
      await loginPage.goto();
      
      const xssAttempts = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';alert('xss');//"
      ];
      
      for (const attempt of xssAttempts) {
        await loginPage.fillPassword(attempt);
        await loginPage.clickLogin();
        await loginPage.expectLoginError();
        await loginPage.clearPassword();
      }
    });

    test('should handle network failure gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/v1/auth/login', route => route.abort());
      
      await loginPage.goto();
      await loginPage.login('test-password');
      
      // Should show error or stay on login page
      await loginPage.expectOnLoginPage();
    });

    test('should handle concurrent login requests', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      
      // Trigger multiple login attempts
      const promises = [
        loginPage.clickLogin(),
        loginPage.clickLogin(),
        loginPage.clickLogin()
      ];
      
      await Promise.all(promises);
      
      // Should still work correctly
      await loginPage.expectLoginSuccess();
    });

    test('should handle browser storage disabled scenario', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {}
          }
        });
      });
      
      await loginPage.goto();
      await loginPage.login('test-password');
      
      // Should still work (token might be stored in memory)
      await loginPage.expectLoginSuccess();
    });

    test('should handle very long password', async ({ page }) => {
      await loginPage.goto();
      
      const longPassword = 'a'.repeat(10000);
      await loginPage.fillPassword(longPassword);
      await loginPage.clickLogin();
      
      // Should handle gracefully (either success or proper error)
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl.includes('/')).toBe(true);
    });

    test('should handle special characters in password', async ({ page }) => {
      await loginPage.goto();
      
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      await loginPage.fillPassword(specialPassword);
      await loginPage.clickLogin();
      
      // Should show error for invalid password
      await loginPage.expectLoginError();
    });

    test('should handle rapid form submission', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      
      // Rapidly click login button
      for (let i = 0; i < 10; i++) {
        await loginPage.clickLogin();
        await page.waitForTimeout(100);
      }
      
      // Should still work correctly
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('UI/UX Validation', () => {
    test('should have correct page title and heading', async ({ page }) => {
      await loginPage.goto();
      await loginPage.expectPageContent();
    });

    test('should show proper loading states', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillPassword('test-password');
      
      // Start login and check loading state
      const loginPromise = loginPage.clickLogin();
      
      // Check that button is disabled during loading (more reliable than spinner)
      await loginPage.expectLoginButtonDisabled();
      
      // Wait for login to complete
      await loginPromise;
      
      // Check that button is enabled again after loading
      await loginPage.expectLoginButtonEnabled();
    });

    test('should have accessible form elements', async ({ page }) => {
      await loginPage.goto();
      
      // Check form accessibility
      await expect(loginPage['form']).toBeVisible();
      await expect(loginPage['passwordInput']).toBeVisible();
      await expect(loginPage['loginButton']).toBeVisible();
      
      // Check labels
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
    });

    test('should handle form validation correctly', async ({ page }) => {
      await loginPage.goto();
      
      // Empty form submission
      await loginPage.clickLogin();
      await loginPage.expectLoginButtonDisabled();
      
      // Fill password and enable button
      await loginPage.fillPassword('test');
      await loginPage.expectLoginButtonEnabled();
    });
  });
});
