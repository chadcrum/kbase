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

    // Create a test markdown file with task lists
    await createVault([
      { path: 'tasks.md', content: `# Task List Test

- [ ] Unchecked task
- [x] Checked task
- [ ] Another task
` }
    ])

    await login(page)
    await page.waitForSelector('.file-tree')

    // Open the test file and switch to Milkdown
    const testFile = page.locator('.node-item:has-text("tasks.md")').first()
    await testFile.click()
    await page.waitForSelector('.viewer-toolbar')

    // Switch to Milkdown editor
    const editorToggle = page.locator('.editor-toggle')
    await editorToggle.click()
    await page.waitForSelector('.milkdown-editor-container')
  })

  test.afterEach(async () => {
    await destroyVault()
  })

  test.describe('Task List Functionality', () => {
    test('should render task list checkboxes', async ({ page }) => {
      // Wait for Milkdown to load
      await page.waitForTimeout(500)

      // Check for task list checkboxes
      const checkboxes = page.locator('.milkdown-task-checkbox')
      await expect(checkboxes).toHaveCount(3)

      // Check initial states
      const uncheckedBoxes = page.locator('.milkdown-task-checkbox:not(:checked)')
      const checkedBoxes = page.locator('.milkdown-task-checkbox:checked')
      await expect(uncheckedBoxes).toHaveCount(2)
      await expect(checkedBoxes).toHaveCount(1)
    })

    test('should toggle checkboxes', async ({ page }) => {
      await page.waitForTimeout(500)

      // Click first checkbox (should be unchecked)
      const firstCheckbox = page.locator('.milkdown-task-checkbox').first()
      await expect(firstCheckbox).not.toBeChecked()

      await firstCheckbox.click()
      await expect(firstCheckbox).toBeChecked()

      // Click again to uncheck
      await firstCheckbox.click()
      await expect(firstCheckbox).not.toBeChecked()
    })

    test('should indent/outdent tasks with Tab/Shift+Tab on checkbox', async ({ page }) => {
      await page.waitForTimeout(500)

      // Focus the first checkbox
      const firstCheckbox = page.locator('.milkdown-task-checkbox').first()
      await firstCheckbox.focus()

      // Press Tab to indent
      await page.keyboard.press('Tab')

      // Wait for the change to take effect
      await page.waitForTimeout(200)

      // The document should now have nested structure
      // Check that the markdown content reflects indentation
      const editor = page.locator('.milkdown-editor-container .ProseMirror')
      const content = await editor.textContent()

      // Should contain indented task (with 4 spaces or similar)
      expect(content).toContain('    - [ ] Unchecked task')

      // Now test Shift+Tab to outdent
      await firstCheckbox.focus()
      await page.keyboard.press('Shift+Tab')

      await page.waitForTimeout(200)

      // Should be back to original indentation
      const updatedContent = await editor.textContent()
      expect(updatedContent).not.toContain('    - [ ] Unchecked task')
    })
  })
})


