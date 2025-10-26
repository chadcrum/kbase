import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

/**
 * Milkdown Editor E2E Tests
 * 
 * Tests for the new Milkdown editor with split-pane view (source | preview).
 * These tests verify the editor functionality and pane switching.
 */

test.describe('Milkdown Editor', () => {
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
    test('should render Milkdown editor for .md files', async ({ page }) => {
      // Should start in Milkdown view (default for .md files)
      await page.waitForSelector('.milkdown-editor-container')
      
      // Check that both source and preview panes are visible by default
      const sourcePane = page.locator('.source-pane')
      const previewPane = page.locator('.preview-pane')
      
      await expect(sourcePane).toBeVisible()
      await expect(previewPane).toBeVisible()
    })

    test('should allow editing in source pane', async ({ page }) => {
      await page.waitForSelector('.milkdown-editor-container')
      
      // Click in the source pane and type content
      const sourcePane = page.locator('.source-pane')
      await sourcePane.click()
      
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('New content added in source pane.')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.floating-save-status.saved')).toBeVisible({ timeout: 3000 })
    })

    test('should update preview pane when source changes', async ({ page }) => {
      await page.waitForSelector('.milkdown-editor-container')
      
      // Type markdown content in source pane
      const sourcePane = page.locator('.source-pane')
      await sourcePane.click()
      
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Test Heading\n\nThis is **bold** text.')
      
      // Wait for preview to update
      await page.waitForTimeout(1000)
      
      // Check that preview pane shows rendered content
      const previewPane = page.locator('.preview-pane')
      await expect(previewPane).toContainText('Test Heading')
      await expect(previewPane).toContainText('bold')
    })
  })

  test.describe('Pane Visibility Controls', () => {
    test('should allow switching between pane views', async ({ page }) => {
      await page.waitForSelector('.milkdown-editor-container')
      
      // Check pane control buttons exist
      const paneControls = page.locator('.pane-controls')
      await expect(paneControls).toBeVisible()
      
      // Test switching to source only
      const sourceOnlyBtn = page.locator('.pane-btn:has-text("</>")')
      await sourceOnlyBtn.click()
      
      const sourcePane = page.locator('.source-pane')
      const previewPane = page.locator('.preview-pane')
      
      await expect(sourcePane).toBeVisible()
      await expect(previewPane).not.toBeVisible()
      
      // Test switching to preview only
      const previewOnlyBtn = page.locator('.pane-btn:has-text("👁")')
      await previewOnlyBtn.click()
      
      await expect(sourcePane).not.toBeVisible()
      await expect(previewPane).toBeVisible()
      
      // Test switching back to both
      const bothBtn = page.locator('.pane-btn:has-text("📄")')
      await bothBtn.click()
      
      await expect(sourcePane).toBeVisible()
      await expect(previewPane).toBeVisible()
    })

    test('should persist pane visibility preference', async ({ page }) => {
      await page.waitForSelector('.milkdown-editor-container')
      
      // Switch to source only
      const sourceOnlyBtn = page.locator('.pane-btn:has-text("</>")')
      await sourceOnlyBtn.click()
      
      // Reload page
      await page.reload()
      await page.waitForSelector('.file-tree')
      
      // Reopen the file
      const testFile = page.locator('.node-item:has-text("sync-test.md")').first()
      await testFile.click()
      await page.waitForSelector('.milkdown-editor-container')
      
      // Should still be in source only mode
      const sourcePane = page.locator('.source-pane')
      const previewPane = page.locator('.preview-pane')
      
      await expect(sourcePane).toBeVisible()
      await expect(previewPane).not.toBeVisible()
    })
  })

  test.describe('Task List Support', () => {
    test('should handle task lists correctly', async ({ page }) => {
      await page.waitForSelector('.milkdown-editor-container')
      
      // Type task list content
      const sourcePane = page.locator('.source-pane')
      await sourcePane.click()
      
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Task List Test\n\n- [ ] Unchecked task\n- [x] Checked task')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.floating-save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Check that preview shows task lists
      const previewPane = page.locator('.preview-pane')
      await expect(previewPane).toContainText('Unchecked task')
      await expect(previewPane).toContainText('Checked task')
      
      // Check for checkboxes
      const uncheckedCheckbox = previewPane.locator('input[type="checkbox"]:not(:checked)')
      const checkedCheckbox = previewPane.locator('input[type="checkbox"]:checked')
      
      await expect(uncheckedCheckbox).toHaveCount(1)
      await expect(checkedCheckbox).toHaveCount(1)
    })
  })

  test.describe('Monaco Editor Integration', () => {
    test('should use Monaco for non-markdown files', async ({ page }) => {
      // Create a non-markdown file
      await createVault([
        { path: 'test.txt', content: 'This is a text file.' }
      ])
      
      // Open the text file
      const textFile = page.locator('.node-item:has-text("test.txt")').first()
      await textFile.click()
      await page.waitForSelector('.monaco-editor-container')
      
      // Should show Monaco editor, not Milkdown
      const monacoContainer = page.locator('.monaco-editor-container')
      const milkdownContainer = page.locator('.milkdown-editor-container')
      
      await expect(monacoContainer).toBeVisible()
      await expect(milkdownContainer).not.toBeVisible()
    })
  })

})

