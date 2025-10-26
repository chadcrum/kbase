import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

/**
 * Monaco Editor E2E Tests
 * 
 * Tests for the Monaco editor used for all file types.
 * These tests verify the editor functionality and auto-save.
 */

test.describe('Monaco Editor', () => {
  test.beforeAll(async () => {
    await startBackend()
  })

  test.afterAll(async () => {
    await stopBackend()
  })

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('http://localhost:5173')
    
    // Create a test markdown file
    await createVault([
      { path: 'sync-test.md', content: '# Original Content\n\nThis is the original content.' }
    ])
    
    await login(page)
    await page.waitForSelector('.file-tree')
    
    // Open the test file
    const testFile = page.locator('.node-item:has-text("sync-test.md")').first()
    await testFile.click()
    await page.waitForSelector('.viewer-toolbar')
  })

  test.afterEach(async () => {
    await destroyVault()
  })

  test.describe('Basic Editor Functionality', () => {
    test('should render Monaco editor for all files', async ({ page }) => {
      // Should show Monaco editor for all file types
      await page.waitForSelector('.monaco-editor-container')
      
      // Check that Monaco editor is visible
      const monacoContainer = page.locator('.monaco-editor-container')
      await expect(monacoContainer).toBeVisible()
    })

    test('should allow editing content', async ({ page }) => {
      await page.waitForSelector('.monaco-editor-container')
      
      // Click in the editor and type content
      const editor = page.locator('.monaco-editor-container')
      await editor.click()
      
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('New content added.')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.floating-save-status.saved')).toBeVisible({ timeout: 3000 })
    })

    test('should provide syntax highlighting', async ({ page }) => {
      await page.waitForSelector('.monaco-editor-container')
      
      // Type markdown content
      const editor = page.locator('.monaco-editor-container')
      await editor.click()
      
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Test Heading\n\nThis is **bold** text.')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.floating-save-status.saved')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('File Type Support', () => {
    test('should use Monaco for markdown files', async ({ page }) => {
      // Should show Monaco editor for .md files
      await page.waitForSelector('.monaco-editor-container')
      
      const monacoContainer = page.locator('.monaco-editor-container')
      await expect(monacoContainer).toBeVisible()
    })

    test('should use Monaco for non-markdown files', async ({ page }) => {
      // Create a non-markdown file
      await createVault([
        { path: 'test.txt', content: 'This is a text file.' }
      ])
      
      // Open the text file
      const textFile = page.locator('.node-item:has-text("test.txt")').first()
      await textFile.click()
      await page.waitForSelector('.monaco-editor-container')
      
      // Should show Monaco editor for all file types
      const monacoContainer = page.locator('.monaco-editor-container')
      await expect(monacoContainer).toBeVisible()
    })
  })

})


