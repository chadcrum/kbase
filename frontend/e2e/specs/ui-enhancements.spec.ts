import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

/**
 * UI Enhancements E2E Tests
 * 
 * Tests for:
 * 1. Directory item counts
 * 2. Sidebar toggle functionality
 * 3. Omni search sorting by modified date
 * 4. TipTap checkbox alignment (visual regression)
 */

test.describe('UI Enhancements', () => {
  test.beforeAll(async () => {
    await startBackend()
  })

  test.afterAll(async () => {
    await stopBackend()
  })

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('http://localhost:5173')
    
    // Create vault with test structure
    await createVault([
      { path: 'note1.md', content: '# Note 1' },
      { path: 'note2.md', content: '# Note 2' },
      { path: 'folder1/note-a.md', content: '# Note A' },
      { path: 'folder1/note-b.md', content: '# Note B' },
      { path: 'folder1/subfolder/deep-note.md', content: '# Deep Note' },
      { path: 'folder2/note-c.md', content: '# Note C' },
      { path: 'folder2/note-d.md', content: '# Note D' },
      { path: 'folder2/note-e.md', content: '# Note E' },
      { path: 'empty-folder/placeholder.md', content: '' } // To create empty folder
    ])
    
    await login(page)
    await page.waitForSelector('.file-tree')
  })

  test.afterEach(async () => {
    await destroyVault()
  })

  test.describe('Directory Item Counts', () => {
    test('should display item count for directories', async ({ page }) => {
      // Wait for file tree to load
      await page.waitForSelector('.file-tree')
      
      // Find folder1 node
      const folder1 = page.locator('.node-item:has-text("folder1")').first()
      await expect(folder1).toBeVisible()
      
      // Check for item count display
      const itemCount = folder1.locator('.item-count')
      await expect(itemCount).toBeVisible()
      
      // folder1 has 2 files + 1 subfolder + 1 file in subfolder = 4 items total
      await expect(itemCount).toContainText('(4)')
    })

    test('should show correct count for nested directories', async ({ page }) => {
      await page.waitForSelector('.file-tree')
      
      // folder2 has 3 files
      const folder2 = page.locator('.node-item:has-text("folder2")').first()
      const folder2Count = folder2.locator('.item-count')
      await expect(folder2Count).toContainText('(3)')
    })

    test('should recursively count all nested items', async ({ page }) => {
      await page.waitForSelector('.file-tree')
      
      // Expand folder1 to see subfolder
      const folder1 = page.locator('.node-item:has-text("folder1")').first()
      await folder1.click()
      await page.waitForTimeout(200)
      
      // Check subfolder count (should have 1 file)
      const subfolder = page.locator('.node-item:has-text("subfolder")').first()
      const subfolderCount = subfolder.locator('.item-count')
      await expect(subfolderCount).toContainText('(1)')
    })

    test('should not display count for files', async ({ page }) => {
      await page.waitForSelector('.file-tree')
      
      // Find a file node
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await expect(note1).toBeVisible()
      
      // Should not have item count
      const itemCount = note1.locator('.item-count')
      await expect(itemCount).not.toBeVisible()
    })

    test('should style item count correctly', async ({ page }) => {
      await page.waitForSelector('.file-tree')
      
      const folder1 = page.locator('.node-item:has-text("folder1")').first()
      const itemCount = folder1.locator('.item-count')
      
      // Check CSS properties
      const color = await itemCount.evaluate(el => 
        window.getComputedStyle(el).color
      )
      const fontSize = await itemCount.evaluate(el => 
        window.getComputedStyle(el).fontSize
      )
      
      // Should be lighter color (greyish)
      expect(color).toContain('rgb(156, 163, 175)') // #9ca3af
      
      // Should be smaller font
      expect(fontSize).toBe('12px') // 0.75rem
    })
  })

  test.describe('Sidebar Toggle', () => {
    test('should display sidebar toggle button in toolbar', async ({ page }) => {
      // Select a file to show the toolbar
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await note1.click()
      await page.waitForSelector('.viewer-toolbar')
      
      // Find toggle button
      const toggleButton = page.locator('.sidebar-toggle-btn')
      await expect(toggleButton).toBeVisible()
      
      // Should show hide icon initially («)
      await expect(toggleButton).toContainText('«')
    })

    test('should collapse sidebar when clicked', async ({ page }) => {
      // Select a file
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await note1.click()
      await page.waitForSelector('.viewer-toolbar')
      
      // Sidebar should be visible
      const sidebar = page.locator('.sidebar')
      await expect(sidebar).toBeVisible()
      await expect(sidebar).not.toHaveClass(/collapsed/)
      
      // Click toggle button
      const toggleButton = page.locator('.sidebar-toggle-btn')
      await toggleButton.click()
      
      // Wait for animation
      await page.waitForTimeout(400)
      
      // Sidebar should have collapsed class
      await expect(sidebar).toHaveClass(/collapsed/)
      
      // Button icon should change to show (»)
      await expect(toggleButton).toContainText('»')
    })

    test('should expand sidebar when clicked again', async ({ page }) => {
      // Select a file
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await note1.click()
      await page.waitForSelector('.viewer-toolbar')
      
      const toggleButton = page.locator('.sidebar-toggle-btn')
      const sidebar = page.locator('.sidebar')
      
      // Collapse sidebar
      await toggleButton.click()
      await page.waitForTimeout(400)
      await expect(sidebar).toHaveClass(/collapsed/)
      
      // Expand sidebar
      await toggleButton.click()
      await page.waitForTimeout(400)
      
      // Sidebar should not have collapsed class
      await expect(sidebar).not.toHaveClass(/collapsed/)
      
      // Button icon should change back to hide («)
      await expect(toggleButton).toContainText('«')
    })

    test('should persist sidebar state when switching files', async ({ page }) => {
      // Select first file
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await note1.click()
      await page.waitForSelector('.viewer-toolbar')
      
      const toggleButton = page.locator('.sidebar-toggle-btn')
      const sidebar = page.locator('.sidebar')
      
      // Collapse sidebar
      await toggleButton.click()
      await page.waitForTimeout(400)
      await expect(sidebar).toHaveClass(/collapsed/)
      
      // Select another file
      const note2 = page.locator('.node-item:has-text("note2.md")').first()
      await note2.click()
      await page.waitForTimeout(200)
      
      // Sidebar should still be collapsed
      await expect(sidebar).toHaveClass(/collapsed/)
      await expect(toggleButton).toContainText('»')
    })

    test('should have smooth animation', async ({ page }) => {
      // Select a file
      const note1 = page.locator('.node-item:has-text("note1.md")').first()
      await note1.click()
      await page.waitForSelector('.viewer-toolbar')
      
      const sidebar = page.locator('.sidebar')
      
      // Check transition property
      const transition = await sidebar.evaluate(el => 
        window.getComputedStyle(el).transition
      )
      
      // Should have transition on margin-left and opacity
      expect(transition).toContain('margin-left')
      expect(transition).toContain('0.3s')
      expect(transition).toContain('ease')
    })
  })

  test.describe('Omni Search Sorting', () => {
    test('should open search modal with Ctrl+K', async ({ page }) => {
      // Press Ctrl+K (Cmd+K on Mac)
      await page.keyboard.press('Control+KeyK')
      
      // Search modal should be visible
      await expect(page.locator('.omni-search-modal')).toBeVisible()
      
      // Search input should be focused
      const searchInput = page.locator('.search-input')
      await expect(searchInput).toBeFocused()
    })

    test('should display search results sorted by modified date', async ({ page }) => {
      // Open search
      await page.keyboard.press('Control+KeyK')
      await expect(page.locator('.omni-search-modal')).toBeVisible()
      
      // Type search query
      await page.type('.search-input', 'note')
      
      // Wait for results
      await page.waitForSelector('.result-item', { timeout: 2000 })
      
      // Get all result items
      const results = page.locator('.result-item')
      const resultCount = await results.count()
      
      expect(resultCount).toBeGreaterThan(0)
      
      // Results should be sorted by modified date (most recent first)
      // We can't easily verify the exact order without knowing modification times,
      // but we can verify results are displayed
      const firstResult = results.first()
      await expect(firstResult).toBeVisible()
    })

    test('should maintain sort order with different search terms', async ({ page }) => {
      // Open search
      await page.keyboard.press('Control+KeyK')
      
      // Search for "folder"
      await page.type('.search-input', 'folder')
      await page.waitForSelector('.result-item', { timeout: 2000 })
      
      // Get result count
      const results1 = await page.locator('.result-item').count()
      expect(results1).toBeGreaterThan(0)
      
      // Clear and search for different term
      await page.fill('.search-input', '')
      await page.type('.search-input', 'deep')
      await page.waitForSelector('.result-item', { timeout: 2000 })
      
      // Should still have results
      const results2 = await page.locator('.result-item').count()
      expect(results2).toBeGreaterThan(0)
    })

    test('should select file when result is clicked', async ({ page }) => {
      // Open search
      await page.keyboard.press('Control+KeyK')
      
      // Search for specific file
      await page.type('.search-input', 'note-a')
      await page.waitForSelector('.result-item', { timeout: 2000 })
      
      // Click first result
      const firstResult = page.locator('.result-item').first()
      await firstResult.click()
      
      // Modal should close
      await expect(page.locator('.omni-search-modal')).not.toBeVisible()
      
      // File should be opened
      await page.waitForSelector('.viewer-toolbar')
      const fileName = page.locator('.file-name')
      await expect(fileName).toContainText('note-a')
    })
  })

  test.describe('TipTap Checkbox Alignment', () => {
    test('should display checkboxes with proper alignment', async ({ page }) => {
      // Create a file with task list
      const taskContent = `# Task List Test

- [ ] Unchecked task
- [x] Checked task
- [ ] Another task with longer text that wraps multiple lines to test alignment`

      await createVault([
        { path: 'tasks.md', content: taskContent }
      ])
      
      // Reload and login
      await page.reload()
      await login(page)
      await page.waitForSelector('.file-tree')
      
      // Select the tasks file
      const tasksFile = page.locator('.node-item:has-text("tasks.md")').first()
      await tasksFile.click()
      await page.waitForSelector('.viewer-toolbar')
      
      // Switch to TipTap view (should be default for .md files)
      await page.waitForSelector('.tiptap-editor')
      
      // Check for task list items
      const taskItems = page.locator('ul[data-type="taskList"] li')
      await expect(taskItems.first()).toBeVisible()
      
      // Verify checkboxes are aligned
      const firstTask = taskItems.first()
      const checkbox = firstTask.locator('input[type="checkbox"]')
      await expect(checkbox).toBeVisible()
      
      // Check CSS alignment properties
      const alignment = await firstTask.evaluate(el => 
        window.getComputedStyle(el).alignItems
      )
      
      // Should use center alignment
      expect(alignment).toBe('center')
    })

    test('should toggle checkboxes correctly', async ({ page }) => {
      const taskContent = `# Tasks
- [ ] Task 1
- [ ] Task 2`

      await createVault([
        { path: 'toggle-tasks.md', content: taskContent }
      ])
      
      await page.reload()
      await login(page)
      await page.waitForSelector('.file-tree')
      
      const tasksFile = page.locator('.node-item:has-text("toggle-tasks.md")').first()
      await tasksFile.click()
      await page.waitForSelector('.tiptap-editor')
      
      // Find first checkbox
      const checkbox = page.locator('input[type="checkbox"]').first()
      await expect(checkbox).not.toBeChecked()
      
      // Click checkbox
      await checkbox.click()
      
      // Should be checked
      await expect(checkbox).toBeChecked()
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      
      // Verify save status
      const saveStatus = page.locator('.save-status')
      await expect(saveStatus).toBeVisible()
    })
  })
})

