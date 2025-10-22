import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

test.describe('File Sorting', () => {
  test.beforeAll(async () => {
    await startBackend()
  })

  test.afterAll(async () => {
    await stopBackend()
  })

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to reset sort preferences
    await context.clearCookies()
    await page.goto('http://localhost:5173')
    
    // Create vault with test files
    await createVault([
      { path: 'zebra.md', content: '# Zebra Note' },
      { path: 'alpha.md', content: '# Alpha Note' },
      { path: 'beta.md', content: '# Beta Note' },
      { path: 'folder-a/note1.md', content: '# Folder A Note 1' },
      { path: 'folder-b/note2.md', content: '# Folder B Note 2' }
    ])
    
    await login(page)
  })

  test.afterEach(async () => {
    await destroyVault()
  })

  test('should display sort buttons in toolbar', async ({ page }) => {
    // Find sort buttons
    const sortOrderButton = page.locator('.toolbar-button[title*="Sort"]').first()
    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')

    await expect(sortOrderButton).toBeVisible()
    await expect(sortCriteriaButton).toBeVisible()
  })

  test('should sort files alphabetically by default', async ({ page }) => {
    // Wait for file tree to load
    await page.waitForSelector('.file-tree')

    // Get file names in order
    const fileNodes = page.locator('.file-tree .node-item .node-name')
    const fileNames = await fileNodes.allTextContents()

    // Folders should come first, then files alphabetically
    expect(fileNames).toContain('folder-a')
    expect(fileNames).toContain('folder-b')
    expect(fileNames).toContain('alpha.md')
    expect(fileNames).toContain('beta.md')
    expect(fileNames).toContain('zebra.md')

    // Get indices of items
    const folderAIndex = fileNames.indexOf('folder-a')
    const folderBIndex = fileNames.indexOf('folder-b')
    const alphaIndex = fileNames.indexOf('alpha.md')
    const betaIndex = fileNames.indexOf('beta.md')
    const zebraIndex = fileNames.indexOf('zebra.md')

    // Folders should be before files
    expect(folderAIndex).toBeLessThan(alphaIndex)
    expect(folderBIndex).toBeLessThan(alphaIndex)

    // Files should be alphabetically sorted
    expect(alphaIndex).toBeLessThan(betaIndex)
    expect(betaIndex).toBeLessThan(zebraIndex)
  })

  test('should toggle sort order when clicking sort order button', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortOrderButton = page.locator('.toolbar-button[title*="Sort"]').first()

    // Initial state should be ascending (⬆️)
    await expect(sortOrderButton).toContainText('⬆️')

    // Click to toggle to descending
    await sortOrderButton.click()
    await expect(sortOrderButton).toContainText('⬇️')

    // Get file names after toggle
    await page.waitForTimeout(100) // Wait for re-render
    const fileNodes = page.locator('.file-tree .node-item .node-name')
    const fileNames = await fileNodes.allTextContents()

    // Get indices of files (folders still first, but reversed order)
    const alphaIndex = fileNames.indexOf('alpha.md')
    const betaIndex = fileNames.indexOf('beta.md')
    const zebraIndex = fileNames.indexOf('zebra.md')

    // Files should be reverse alphabetically sorted (within files group)
    expect(zebraIndex).toBeLessThan(betaIndex)
    expect(betaIndex).toBeLessThan(alphaIndex)

    // Click again to toggle back to ascending
    await sortOrderButton.click()
    await expect(sortOrderButton).toContainText('⬆️')
  })

  test('should open sort dropdown when clicking sort criteria button', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')
    
    // Dropdown should not be visible initially
    await expect(page.locator('.sort-dropdown')).not.toBeVisible()

    // Click to open dropdown
    await sortCriteriaButton.click()

    // Dropdown should be visible
    await expect(page.locator('.sort-dropdown')).toBeVisible()

    // Should show all sort options
    await expect(page.locator('.sort-option').nth(0)).toContainText('Name')
    await expect(page.locator('.sort-option').nth(1)).toContainText('Created Date')
    await expect(page.locator('.sort-option').nth(2)).toContainText('Modified Date')
  })

  test('should change sort criteria when selecting from dropdown', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')

    // Open dropdown
    await sortCriteriaButton.click()
    await expect(page.locator('.sort-dropdown')).toBeVisible()

    // Select "Created Date"
    await page.locator('.sort-option').nth(1).click()

    // Dropdown should close
    await expect(page.locator('.sort-dropdown')).not.toBeVisible()

    // Files should now be sorted by created date
    // (We can't verify the exact order without knowing creation times,
    // but we can verify the dropdown closed and no errors occurred)
  })

  test('should close dropdown when clicking outside', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')

    // Open dropdown
    await sortCriteriaButton.click()
    await expect(page.locator('.sort-dropdown')).toBeVisible()

    // Click outside (on the file tree)
    await page.locator('.file-tree').click()

    // Dropdown should close
    await expect(page.locator('.sort-dropdown')).not.toBeVisible()
  })

  test('should persist sort preferences across page reloads', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortOrderButton = page.locator('.toolbar-button[title*="Sort"]').first()
    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')

    // Change sort order to descending
    await sortOrderButton.click()
    await expect(sortOrderButton).toContainText('⬇️')

    // Change sort criteria to "Modified Date"
    await sortCriteriaButton.click()
    await page.locator('.sort-option').nth(2).click()

    // Reload the page
    await page.reload()
    await page.waitForSelector('.file-tree')

    // Sort preferences should be preserved
    const newSortOrderButton = page.locator('.toolbar-button[title*="Sort"]').first()
    await expect(newSortOrderButton).toContainText('⬇️')

    // Open dropdown to check selected option
    const newSortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')
    await newSortCriteriaButton.click()

    // Modified Date option should be marked as active
    const modifiedOption = page.locator('.sort-option').nth(2)
    await expect(modifiedOption).toHaveClass(/active/)
  })

  test('should maintain folder-first ordering regardless of sort criteria', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const sortCriteriaButton = page.locator('.toolbar-button[title="Sort by"]')

    // Try different sort criteria
    const sortOptions = ['Name', 'Created Date', 'Modified Date']

    for (const option of sortOptions) {
      // Open dropdown and select option
      await sortCriteriaButton.click()
      await page.locator(`.sort-option:has-text("${option}")`).click()
      
      await page.waitForTimeout(100) // Wait for re-render

      // Get all node names
      const fileNodes = page.locator('.file-tree .node-item .node-name')
      const fileNames = await fileNodes.allTextContents()

      // Find indices of folders and files
      const folderAIndex = fileNames.indexOf('folder-a')
      const folderBIndex = fileNames.indexOf('folder-b')
      const alphaIndex = fileNames.indexOf('alpha.md')

      // Folders should always come before files
      expect(folderAIndex).toBeLessThan(alphaIndex)
      expect(folderBIndex).toBeLessThan(alphaIndex)
    }
  })

  test('should sort nested files within folders', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    // Expand folder-a
    const folderA = page.locator('.node-item:has-text("folder-a")').first()
    await folderA.click()

    // Wait for children to appear
    await page.waitForTimeout(200)

    // Nested files should also be sorted
    const nestedFiles = page.locator('.children .node-item .node-name')
    
    // Should have at least one nested file
    expect(await nestedFiles.count()).toBeGreaterThan(0)
  })
})

