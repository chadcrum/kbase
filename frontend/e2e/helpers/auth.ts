import { Page, expect } from '@playwright/test';

/**
 * Authentication helper utilities for e2e tests
 * 
 * Provides utilities for login, token management, and auth state validation
 * in Playwright tests.
 */

export interface AuthCredentials {
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

export class AuthHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Login with credentials
   */
  async login(credentials: AuthCredentials): Promise<LoginResult> {
    try {
      // Navigate to login page
      await this.page.goto('/login');
      
      // Wait for login form to be visible
      await this.page.waitForSelector('input[type="password"]');
      
      // Fill in password
      await this.page.fill('input[type="password"]', credentials.password);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation or error
      await this.page.waitForLoadState('networkidle');
      
      // Check if login was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        // Still on login page, check for error
        const errorElement = await this.page.$('.error-message');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          return { success: false, error: errorText || 'Login failed' };
        }
        return { success: false, error: 'Login failed - still on login page' };
      }
      
      // Login successful, get token
      const token = await this.getStoredToken();
      return { success: true, token: token || undefined };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown login error' 
      };
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    // Navigate to home page first
    await this.page.goto('/');
    
    // Look for logout button/link
    const logoutButton = await this.page.$('[data-testid="logout-button"], button:has-text("Logout"), a:has-text("Logout")');
    
    if (logoutButton) {
      await logoutButton.click();
      await this.page.waitForLoadState('networkidle');
    }
    
    // Clear localStorage
    await this.clearAuth();
  }

  /**
   * Get the stored JWT token from localStorage
   */
  async getStoredToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });
  }

  /**
   * Clear all authentication state
   */
  async clearAuth(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_state');
      // Clear any other auth-related storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('token')) {
          localStorage.removeItem(key);
        }
      });
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) return false;
    
    // Verify token is valid (not expired)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || !payload.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Create an expired JWT token for testing
   */
  createExpiredToken(_secret: string = 'test-secret'): string {
    // Simple expired token creation without jwt library
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: 'user',
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
    }));
    const signature = btoa('expired-signature');
    
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Create an invalid JWT token for testing
   */
  createInvalidToken(): string {
    return 'invalid.jwt.token';
  }

  /**
   * Set a token in localStorage
   */
  async setToken(token: string): Promise<void> {
    await this.page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token);
  }

  /**
   * Navigate to a protected route and expect redirect to login
   */
  async expectRedirectToLogin(route: string = '/'): Promise<void> {
    await this.page.goto(route);
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  /**
   * Navigate to login page and expect redirect to home (if authenticated)
   */
  async expectRedirectToHome(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/.*\/$/);
  }

  /**
   * Wait for authentication state to be determined
   */
  async waitForAuthState(): Promise<boolean> {
    // Wait for auth initialization (check for loading states)
    await this.page.waitForFunction(() => {
      // Check if auth store is no longer loading
      const loadingElements = document.querySelectorAll('[data-testid="auth-loading"], .loading');
      return loadingElements.length === 0;
    }, { timeout: 10000 });
    
    return await this.isAuthenticated();
  }

  /**
   * Get authentication error message
   */
  async getAuthError(): Promise<string | null> {
    const errorElement = await this.page.$('.error-message, [data-testid="auth-error"]');
    if (errorElement) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Check if login form is in loading state
   */
  async isLoginLoading(): Promise<boolean> {
    const loadingElement = await this.page.$('.loading-spinner, [data-testid="login-loading"]');
    return loadingElement !== null;
  }

  /**
   * Wait for login form to finish loading
   */
  async waitForLoginComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-spinner, [data-testid="login-loading"]');
      return loadingElement === null;
    }, { timeout: 10000 });
  }
}

/**
 * Create an auth helper instance
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page);
}

/**
 * Quick login utility for tests
 */
export async function quickLogin(page: Page, password: string = 'test-password'): Promise<LoginResult> {
  const authHelper = createAuthHelper(page);
  return await authHelper.login({ password });
}

/**
 * Quick logout utility for tests
 */
export async function quickLogout(page: Page): Promise<void> {
  const authHelper = createAuthHelper(page);
  await authHelper.logout();
}
