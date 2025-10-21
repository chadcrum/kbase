import { Page, expect, Locator } from '@playwright/test';

/**
 * Login Page Object Model
 * 
 * Encapsulates all interactions with the login page including:
 * - Form interactions
 * - Error handling
 * - Loading states
 * - Navigation expectations
 */

export class LoginPage {
  private page: Page;

  // Locators
  private passwordInput: Locator;
  private loginButton: Locator;
  private errorMessage: Locator;
  private loadingSpinner: Locator;
  private form: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error-message');
    this.loadingSpinner = page.locator('.loading-spinner');
    this.form = page.locator('form');
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.passwordInput).toBeVisible();
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the login button
   */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Perform complete login flow
   */
  async login(password: string): Promise<void> {
    await this.fillPassword(password);
    await this.clickLogin();
  }

  /**
   * Get the current password value
   */
  async getPasswordValue(): Promise<string> {
    return await this.passwordInput.inputValue();
  }

  /**
   * Check if the password input is focused
   */
  async isPasswordFocused(): Promise<boolean> {
    return await this.passwordInput.evaluate(el => el === document.activeElement);
  }

  /**
   * Check if the login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  /**
   * Check if the login button is enabled
   */
  async isLoginButtonEnabled(): Promise<boolean> {
    return !(await this.isLoginButtonDisabled());
  }

  /**
   * Check if the form is in loading state
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('.loading-spinner');
      return spinner === null;
    }, { timeout: 10000 });
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if an error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Wait for error message to appear
   */
  async waitForError(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    const errorText = await this.errorMessage.textContent();
    return errorText || '';
  }

  /**
   * Clear the password field
   */
  async clearPassword(): Promise<void> {
    await this.passwordInput.clear();
  }

  /**
   * Press Enter in the password field
   */
  async pressEnterInPassword(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get the main heading text
   */
  async getHeadingText(): Promise<string> {
    const heading = this.page.locator('h1');
    return await heading.textContent() || '';
  }

  /**
   * Get the subtitle text
   */
  async getSubtitleText(): Promise<string> {
    const subtitle = this.page.locator('.login-subtitle');
    return await subtitle.textContent() || '';
  }

  // Assertion methods

  /**
   * Expect login to be successful (redirect to home)
   */
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/$/);
    await expect(this.page).not.toHaveURL(/.*\/login/);
  }

  /**
   * Expect login to fail with error message
   */
  async expectLoginError(expectedError?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    
    if (expectedError) {
      await expect(this.errorMessage).toContainText(expectedError);
    }
    
    // Should still be on login page
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  /**
   * Expect to be on login page
   */
  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/login/);
    await expect(this.passwordInput).toBeVisible();
  }

  /**
   * Expect password input to be focused
   */
  async expectPasswordFocused(): Promise<void> {
    await expect(this.passwordInput).toBeFocused();
  }

  /**
   * Expect login button to be disabled
   */
  async expectLoginButtonDisabled(): Promise<void> {
    await expect(this.loginButton).toBeDisabled();
  }

  /**
   * Expect login button to be enabled
   */
  async expectLoginButtonEnabled(): Promise<void> {
    await expect(this.loginButton).toBeEnabled();
  }

  /**
   * Expect loading state
   */
  async expectLoading(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible();
  }

  /**
   * Expect no loading state
   */
  async expectNotLoading(): Promise<void> {
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  /**
   * Expect no error message
   */
  async expectNoError(): Promise<void> {
    await expect(this.errorMessage).not.toBeVisible();
  }

  /**
   * Expect form to be visible
   */
  async expectFormVisible(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Expect page to have correct title and heading
   */
  async expectPageContent(): Promise<void> {
    await expect(this.page).toHaveTitle(/KBase/);
    await expect(await this.getHeadingText()).toContain('KBase');
    await expect(await this.getSubtitleText()).toContain('Sign in');
  }
}
