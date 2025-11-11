import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

const openToolbarMenu = async (page: Page) => {
  const trigger = page.locator('.toolbar-menu-trigger')
  await expect(trigger).toBeVisible()
  await trigger.click()
}

const menuItem = (page: Page, text: string) =>
  page.locator('.toolbar-dropdown-item', { hasText: text })

test.describe('File Sorting', () => {
  test.beforeAll(async () => {
    await startBackend()
  })

  test.afterAll(async () => {
    await stopBackend()
  })

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('http://localhost:5173')

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

  test('should expose sorting controls inside toolbar menu', async ({ page }) => {
    await openToolbarMenu(page)

    await expect(menuItem(page, 'Sort Ascending')).toBeVisible()
    await expect(menuItem(page, 'Name')).toBeVisible()
    await expect(menuItem(page, 'Created Date')).toBeVisible()
    await expect(menuItem(page, 'Modified Date')).toBeVisible()
  })

  test('should sort files alphabetically by default', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const fileNodes = page.locator('.file-tree .node-item .node-name')
    const fileNames = await fileNodes.allTextContents()

    expect(fileNames).toContain('folder-a')
    expect(fileNames).toContain('folder-b')
    expect(fileNames).toContain('alpha.md')
    expect(fileNames).toContain('beta.md')
    expect(fileNames).toContain('zebra.md')

    const folderAIndex = fileNames.indexOf('folder-a')
    const folderBIndex = fileNames.indexOf('folder-b')
    const alphaIndex = fileNames.indexOf('alpha.md')
    const betaIndex = fileNames.indexOf('beta.md')
    const zebraIndex = fileNames.indexOf('zebra.md')

    expect(folderAIndex).toBeLessThan(alphaIndex)
    expect(folderBIndex).toBeLessThan(alphaIndex)
    expect(alphaIndex).toBeLessThan(betaIndex)
    expect(betaIndex).toBeLessThan(zebraIndex)
  })

  test('should toggle sort order via menu', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    await openToolbarMenu(page)
    const sortAscending = menuItem(page, 'Sort Ascending')
    await expect(sortAscending).toContainText('⬆️')
    await sortAscending.click()

    await page.waitForTimeout(100)
    let fileNames = await page.locator('.file-tree .node-item .node-name').allTextContents()

    const alphaIndex = fileNames.indexOf('alpha.md')
    const betaIndex = fileNames.indexOf('beta.md')
    const zebraIndex = fileNames.indexOf('zebra.md')
    expect(zebraIndex).toBeLessThan(betaIndex)
    expect(betaIndex).toBeLessThan(alphaIndex)

    await openToolbarMenu(page)
    const sortDescending = menuItem(page, 'Sort Descending')
    await expect(sortDescending).toContainText('⬇️')
    await sortDescending.click()

    await page.waitForTimeout(100)
    fileNames = await page.locator('.file-tree .node-item .node-name').allTextContents()
    expect(fileNames.indexOf('alpha.md')).toBeLessThan(fileNames.indexOf('beta.md'))
  })

  test('should change sort criteria using menu options', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    await openToolbarMenu(page)
    await menuItem(page, 'Created Date').click()
    await page.waitForTimeout(50)

    await openToolbarMenu(page)
    const modifiedOption = menuItem(page, 'Modified Date')
    await modifiedOption.click()

    await page.waitForTimeout(50)
    await openToolbarMenu(page)
    await expect(menuItem(page, 'Modified Date')).toHaveClass(/active/)
  })

  test('should close menu when clicking outside', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    await openToolbarMenu(page)
    await expect(page.locator('.toolbar-dropdown')).toBeVisible()

    await page.locator('.file-tree').click()
    await expect(page.locator('.toolbar-dropdown')).not.toBeVisible()
  })

  test('should persist sort preferences across reloads', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    await openToolbarMenu(page)
    await menuItem(page, 'Sort Ascending').click()

    await openToolbarMenu(page)
    await menuItem(page, 'Modified Date').click()

    await page.reload()
    await page.waitForSelector('.file-tree')

    await openToolbarMenu(page)
    await expect(menuItem(page, 'Sort Descending')).toBeVisible()
    await expect(menuItem(page, 'Modified Date')).toHaveClass(/active/)
  })

  test('should maintain folder-first ordering across sort criteria', async ({ page }) => {
    await page.waitForSelector('.file-tree')
    const sortOptions = ['Name', 'Created Date', 'Modified Date']

    for (const option of sortOptions) {
      await openToolbarMenu(page)
      await menuItem(page, option).click()
      await page.waitForTimeout(100)

      const fileNames = await page.locator('.file-tree .node-item .node-name').allTextContents()
      const folderAIndex = fileNames.indexOf('folder-a')
      const folderBIndex = fileNames.indexOf('folder-b')
      const alphaIndex = fileNames.indexOf('alpha.md')

      expect(folderAIndex).toBeLessThan(alphaIndex)
      expect(folderBIndex).toBeLessThan(alphaIndex)
    }
  })

  test('should sort nested files within folders', async ({ page }) => {
    await page.waitForSelector('.file-tree')

    const folderA = page.locator('.node-item:has-text("folder-a")').first()
    await folderA.click()

    await page.waitForTimeout(200)

    const nestedFiles = page.locator('.children .node-item .node-name')
    expect(await nestedFiles.count()).toBeGreaterThan(0)
  })
})

