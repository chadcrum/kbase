import { Page, expect, Locator } from '@playwright/test';

/**
 * Home Page Object Model
 * 
 * Encapsulates all interactions with the home page including:
 * - Authentication state
 * - File tree navigation
 * - Note viewing
 * - Logout functionality
 */

export class HomePage {
  private page: Page;

  // Locators
  private logoutButton: Locator;
  private fileTree: Locator;
  private noteViewer: Locator;
  private sidebar: Locator;
  private mainContent: Locator;
  private loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Logout"), a:has-text("Logout")');
    this.fileTree = page.locator('.file-tree').first();
    this.noteViewer = page.locator('.note-viewer').first();
    this.sidebar = page.locator('.sidebar, [data-testid="sidebar"]');
    this.mainContent = page.locator('.main-content, [data-testid="main-content"]');
    this.loadingSpinner = page.locator('.loading, [data-testid="loading"]');
  }

  /**
   * Navigate to the home page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for either file tree or redirect to login
    await Promise.race([
      this.fileTree.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.page.waitForURL(/.*\/login/, { timeout: 5000 }).catch(() => {})
    ]);
  }

  /**
   * Click the logout button
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is logged in (not redirected to login)
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }

  /**
   * Check if logout button is visible
   */
  async isLogoutButtonVisible(): Promise<boolean> {
    return await this.logoutButton.isVisible();
  }

  /**
   * Check if file tree is visible
   */
  async isFileTreeVisible(): Promise<boolean> {
    return await this.fileTree.isVisible();
  }

  /**
   * Check if note viewer is visible
   */
  async isNoteViewerVisible(): Promise<boolean> {
    return await this.noteViewer.isVisible();
  }

  /**
   * Check if sidebar is visible
   */
  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  /**
   * Check if main content is visible
   */
  async isMainContentVisible(): Promise<boolean> {
    return await this.mainContent.isVisible();
  }

  /**
   * Check if page is in loading state
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('.loading, [data-testid="loading"]');
      return spinner === null;
    }, { timeout: 10000 });
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get file tree content
   */
  async getFileTreeContent(): Promise<string> {
    if (await this.fileTree.isVisible()) {
      return await this.fileTree.textContent() || '';
    }
    return '';
  }

  /**
   * Get note viewer content
   */
  async getNoteViewerContent(): Promise<string> {
    if (await this.noteViewer.isVisible()) {
      return await this.noteViewer.textContent() || '';
    }
    return '';
  }

  /**
   * Click on a file in the file tree
   */
  async clickFile(fileName: string): Promise<void> {
    const fileElement = this.page.locator(`[data-testid="file-${fileName}"], .file-tree a:has-text("${fileName}")`);
    await fileElement.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on a folder in the file tree
   */
  async clickFolder(folderName: string): Promise<void> {
    const folderElement = this.page.locator(`[data-testid="folder-${folderName}"], .file-tree .folder:has-text("${folderName}")`);
    await folderElement.click();
  }

  /**
   * Get all visible file names in the tree
   */
  async getVisibleFiles(): Promise<string[]> {
    const fileElements = this.page.locator('.file-tree a, .file-tree .file');
    const count = await fileElements.count();
    const files: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await fileElements.nth(i).textContent();
      if (text) {
        files.push(text.trim());
      }
    }
    
    return files;
  }

  /**
   * Get all visible folder names in the tree
   */
  async getVisibleFolders(): Promise<string[]> {
    const folderElements = this.page.locator('.file-tree .folder, .file-tree [data-testid*="folder"]');
    const count = await folderElements.count();
    const folders: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await folderElements.nth(i).textContent();
      if (text) {
        folders.push(text.trim());
      }
    }
    
    return folders;
  }

  /**
   * Wait for a specific file to appear in the tree
   */
  async waitForFile(fileName: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(`[data-testid="file-${fileName}"], .file-tree a:has-text("${fileName}")`, { timeout });
  }

  /**
   * Wait for a specific folder to appear in the tree
   */
  async waitForFolder(folderName: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(`[data-testid="folder-${folderName}"], .file-tree .folder:has-text("${folderName}")`, { timeout });
  }

  // Assertion methods

  /**
   * Expect to be authenticated (on home page, not login)
   */
  async expectAuthenticated(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/$/);
    await expect(this.page).not.toHaveURL(/.*\/login/);
  }

  /**
   * Expect to be redirected to login (not authenticated)
   */
  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  /**
   * Expect file tree to be visible
   */
  async expectFileTreeVisible(): Promise<void> {
    await expect(this.fileTree).toBeVisible();
  }

  /**
   * Expect note viewer to be visible
   */
  async expectNoteViewerVisible(): Promise<void> {
    await expect(this.noteViewer).toBeVisible();
  }

  /**
   * Expect sidebar to be visible
   */
  async expectSidebarVisible(): Promise<void> {
    await expect(this.sidebar).toBeVisible();
  }

  /**
   * Expect main content to be visible
   */
  async expectMainContentVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible();
  }

  /**
   * Expect logout button to be visible
   */
  async expectLogoutButtonVisible(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
  }

  /**
   * Expect logout button to be hidden
   */
  async expectLogoutButtonHidden(): Promise<void> {
    await expect(this.logoutButton).not.toBeVisible();
  }

  /**
   * Expect specific file to be visible in tree
   */
  async expectFileVisible(fileName: string): Promise<void> {
    const fileElement = this.page.locator(`[data-testid="file-${fileName}"], .file-tree a:has-text("${fileName}")`);
    await expect(fileElement).toBeVisible();
  }

  /**
   * Expect specific folder to be visible in tree
   */
  async expectFolderVisible(folderName: string): Promise<void> {
    const folderElement = this.page.locator(`[data-testid="folder-${folderName}"], .file-tree .folder:has-text("${folderName}")`);
    await expect(folderElement).toBeVisible();
  }

  /**
   * Expect note content to contain specific text
   */
  async expectNoteContentContains(text: string): Promise<void> {
    await expect(this.noteViewer).toContainText(text);
  }

  /**
   * Expect page to have correct title
   */
  async expectCorrectTitle(): Promise<void> {
    await expect(this.page).toHaveTitle(/KBase/);
  }

  /**
   * Expect no loading state
   */
  async expectNotLoading(): Promise<void> {
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  /**
   * Expect page to be fully loaded
   */
  async expectPageLoaded(): Promise<void> {
    await this.expectNotLoading();
    await this.expectFileTreeVisible();
    await this.expectNoteViewerVisible();
  }
}
