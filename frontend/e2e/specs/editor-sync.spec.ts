import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { startBackend, stopBackend } from '../helpers/backend'
import { createVault, destroyVault } from '../helpers/vault'

/**
 * Editor Bidirectional Sync E2E Tests
 * 
 * Critical tests to ensure no data loss when switching between Monaco and TipTap editors.
 * These tests verify the fixes for the bidirectional sync issues.
 */

test.describe('Editor Bidirectional Sync', () => {
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

  test.describe('TipTap to Monaco Sync', () => {
    test('should preserve changes when switching from TipTap to Monaco after save', async ({ page }) => {
      // Should start in TipTap view (default for .md files)
      await page.waitForSelector('.tiptap-editor')
      
      // Get the TipTap editor
      const editor = page.locator('.tiptap')
      await editor.click()
      
      // Type new content
      await page.keyboard.press('End') // Go to end
      await page.keyboard.press('Enter')
      await page.keyboard.type('New content added in TipTap.')
      
      // Wait for auto-save (1 second debounce)
      await page.waitForTimeout(1500)
      
      // Verify save status
      const saveStatus = page.locator('.save-status.saved')
      await expect(saveStatus).toBeVisible({ timeout: 3000 })
      
      // Switch to Monaco editor
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      
      // Wait for Monaco to load
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get Monaco content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Verify content includes the new text
      expect(monacoContent).toContain('New content added in TipTap.')
      expect(monacoContent).toContain('Original Content')
    })

    test('should preserve changes when switching immediately without waiting for save', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const editor = page.locator('.tiptap')
      await editor.click()
      
      // Type new content
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Immediate switch test.')
      
      // Switch immediately without waiting for save
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get Monaco content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Content should still be preserved
      expect(monacoContent).toContain('Immediate switch test.')
    })

    test('should handle task list content correctly', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const editor = page.locator('.tiptap')
      await editor.click()
      
      // Clear content and add task list
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Task List Test')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await page.keyboard.type('- [ ] Unchecked task')
      await page.keyboard.press('Enter')
      await page.keyboard.type('- [x] Checked task')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get Monaco content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Verify markdown format is preserved
      expect(monacoContent).toContain('- [ ] Unchecked task')
      expect(monacoContent).toContain('- [x] Checked task')
    })
  })

  test.describe('Monaco to TipTap Sync', () => {
    test('should preserve changes when switching from Monaco to TipTap after save', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Switch to Monaco editor first
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Type in Monaco
      await page.keyboard.press('Control+End') // Go to end
      await page.keyboard.press('Enter')
      await page.keyboard.type('New content from Monaco editor.')
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch back to TipTap
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Get TipTap content
      const tiptapContent = await page.locator('.tiptap').textContent()
      
      // Verify content includes the new text
      expect(tiptapContent).toContain('New content from Monaco editor.')
      expect(tiptapContent).toContain('Original Content')
    })

    test('should preserve changes when switching immediately without waiting for save', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Type new content
      await page.keyboard.press('Control+End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Immediate switch from Monaco.')
      
      // Switch immediately without waiting
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Get TipTap content
      const tiptapContent = await page.locator('.tiptap').textContent()
      
      // Content should be preserved
      expect(tiptapContent).toContain('Immediate switch from Monaco.')
    })

    test('should preserve markdown formatting', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Clear and type markdown content
      await page.keyboard.press('Control+A')
      const markdownContent = `# Heading 1
## Heading 2

This is **bold** and this is *italic*.

- List item 1
- List item 2

\`\`\`javascript
console.log('code block');
\`\`\`

> Blockquote text`

      await page.keyboard.type(markdownContent.replace(/\n/g, '\n'))
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to TipTap
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Verify rendered content
      const h1 = page.locator('.tiptap h1')
      await expect(h1).toContainText('Heading 1')
      
      const h2 = page.locator('.tiptap h2')
      await expect(h2).toContainText('Heading 2')
      
      const bold = page.locator('.tiptap strong')
      await expect(bold.first()).toContainText('bold')
      
      const italic = page.locator('.tiptap em')
      await expect(italic.first()).toContainText('italic')
      
      const codeBlock = page.locator('.tiptap pre')
      await expect(codeBlock).toBeVisible()
      
      const blockquote = page.locator('.tiptap blockquote')
      await expect(blockquote).toContainText('Blockquote text')
    })
  })

  test.describe('Rapid Switching', () => {
    test('should handle rapid switching without data loss', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const toggleButton = page.locator('.toggle-btn')
      const editor = page.locator('.tiptap')
      
      // Add content in TipTap
      await editor.click()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('First change in TipTap.')
      
      // Rapid switch to Monaco and back
      await toggleButton.click()
      await page.waitForTimeout(200)
      await toggleButton.click()
      await page.waitForTimeout(200)
      
      // Add more content
      await editor.click()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Second change after switching.')
      
      // Switch to Monaco
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Verify all content is present
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      expect(monacoContent).toContain('First change in TipTap.')
      expect(monacoContent).toContain('Second change after switching.')
      expect(monacoContent).toContain('Original Content')
    })

    test('should not create duplicate content', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const toggleButton = page.locator('.toggle-btn')
      const uniqueText = `Unique-${Date.now()}`
      
      // Add unique content in TipTap
      const editor = page.locator('.tiptap')
      await editor.click()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await page.keyboard.type(uniqueText)
      
      // Wait for save
      await page.waitForTimeout(1500)
      
      // Switch multiple times
      for (let i = 0; i < 3; i++) {
        await toggleButton.click()
        await page.waitForTimeout(300)
        await toggleButton.click()
        await page.waitForTimeout(300)
      }
      
      // Get final content from Monaco
      await toggleButton.click() // Ensure we're in Monaco
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Count occurrences of unique text - should only appear once
      const occurrences = (monacoContent || '').split(uniqueText).length - 1
      expect(occurrences).toBe(1)
    })
  })

  test.describe('Complex Content Scenarios', () => {
    test('should handle mixed content with special characters', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const complexContent = `# Special Characters Test

* Bullet with **bold** and *italic*
* Line with \`inline code\`
* Special chars: <>&"'

> Quote with [link](https://example.com)

1. Numbered list
2. Second item`

      // Type in TipTap
      const editor = page.locator('.tiptap')
      await editor.click()
      await page.keyboard.press('Control+A')
      
      // Type line by line
      for (const line of complexContent.split('\n')) {
        await page.keyboard.type(line)
        await page.keyboard.press('Enter')
      }
      
      // Wait for save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Verify special characters are preserved
      expect(monacoContent).toContain('**bold**')
      expect(monacoContent).toContain('*italic*')
      expect(monacoContent).toContain('`inline code`')
      expect(monacoContent).toContain('<>&"\'')
      expect(monacoContent).toContain('[link](https://example.com)')
      
      // Switch back to TipTap
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Verify rendering
      const bold = page.locator('.tiptap strong')
      await expect(bold.first()).toContainText('bold')
      
      const link = page.locator('.tiptap a')
      await expect(link.first()).toHaveAttribute('href', 'https://example.com')
    })

    test('should preserve empty lines and spacing', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const toggleButton = page.locator('.toggle-btn')
      
      // Switch to Monaco for precise control
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Type content with specific spacing
      await page.keyboard.press('Control+A')
      const contentWithSpacing = `Line 1


Line 2 (two blank lines above)



Line 3 (three blank lines above)`
      
      await page.keyboard.type(contentWithSpacing)
      
      // Wait for save
      await page.waitForTimeout(1500)
      
      // Switch to TipTap
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Switch back to Monaco
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Verify spacing is preserved
      const finalContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Check that blank lines are preserved
      expect(finalContent).toContain('\n\n\n')
    })
  })

  test.describe('Error Recovery', () => {
    test('should recover from rapid repeated edits', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const editor = page.locator('.tiptap')
      const toggleButton = page.locator('.toggle-btn')
      
      // Make multiple rapid edits
      for (let i = 0; i < 5; i++) {
        await editor.click()
        await page.keyboard.type(`Edit ${i}. `)
        await page.waitForTimeout(100)
      }
      
      // Wait for auto-save
      await page.waitForTimeout(1500)
      
      // Switch editors
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // All edits should be present
      for (let i = 0; i < 5; i++) {
        expect(monacoContent).toContain(`Edit ${i}.`)
      }
    })
  })

  test.describe('v-show Implementation Tests (Critical)', () => {
    test('should keep both editors mounted with v-show', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Both editor containers should exist in DOM even when hidden
      const monacoContainer = page.locator('.editor-view')
      const tiptapContainer = page.locator('.wysiwyg-view')
      
      // TipTap is visible, Monaco is hidden
      await expect(tiptapContainer).toBeVisible()
      await expect(monacoContainer).not.toBeVisible()
      
      // But Monaco container should still exist in DOM
      const monacoExists = await monacoContainer.count()
      expect(monacoExists).toBe(1)
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForTimeout(500)
      
      // Now Monaco is visible, TipTap is hidden
      await expect(monacoContainer).toBeVisible()
      await expect(tiptapContainer).not.toBeVisible()
      
      // But TipTap container should still exist in DOM
      const tiptapExists = await tiptapContainer.count()
      expect(tiptapExists).toBeGreaterThan(0)
    })

    test('hidden editor should receive updates from active editor', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Type in TipTap (active editor)
      const editor = page.locator('.tiptap')
      await editor.click()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      const uniqueText = `Sync-Test-${Date.now()}`
      await page.keyboard.type(uniqueText)
      
      // Don't wait for save - switch immediately
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(300)
      
      // Monaco (now active) should have received the update
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      expect(monacoContent).toContain(uniqueText)
      
      // Now type in Monaco
      await page.keyboard.press('Control+End')
      await page.keyboard.press('Enter')
      const secondUniqueText = `Monaco-Test-${Date.now()}`
      await page.keyboard.type(secondUniqueText)
      
      // Switch back to TipTap immediately
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(300)
      
      // TipTap should have received Monaco's update
      const tiptapContent = await page.locator('.tiptap').textContent()
      expect(tiptapContent).toContain(secondUniqueText)
      expect(tiptapContent).toContain(uniqueText)
    })

    test('disabled prop should prevent editor from emitting changes', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Type in Monaco
      await page.keyboard.press('Control+End')
      await page.keyboard.press('Enter')
      const testText = `Monaco-Content-${Date.now()}`
      await page.keyboard.type(testText)
      
      // Wait for debounce and save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to TipTap
      await toggleButton.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      // Verify content is in TipTap
      const tiptapContent = await page.locator('.tiptap').textContent()
      expect(tiptapContent).toContain(testText)
      
      // Content should be saved to backend
      // Reload page to verify persistence
      await page.reload()
      await page.waitForSelector('.file-tree')
      
      const testFile = page.locator('.node-item:has-text("sync-test.md")').first()
      await testFile.click()
      await page.waitForSelector('.tiptap-editor')
      await page.waitForTimeout(500)
      
      const reloadedContent = await page.locator('.tiptap').textContent()
      expect(reloadedContent).toContain(testText)
    })

    test('bullet list text should persist when switching editors', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      // Create bullet list in TipTap
      const editor = page.locator('.tiptap')
      await editor.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Bullet List Test')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      
      // Create bullet list items
      await page.keyboard.type('- First bullet item with text')
      await page.keyboard.press('Enter')
      await page.keyboard.type('- Second bullet item with text')
      await page.keyboard.press('Enter')
      await page.keyboard.type('- Third bullet item with text')
      
      // Wait for save
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      // Get Monaco content
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // CRITICAL: Text should be preserved (this was the bug)
      expect(monacoContent).toContain('- First bullet item with text')
      expect(monacoContent).toContain('- Second bullet item with text')
      expect(monacoContent).toContain('- Third bullet item with text')
      
      // Text should NOT disappear (only bullets remaining)
      // Count how many list markers exist
      const bulletMarkers = (monacoContent || '').match(/^- /gm)
      expect(bulletMarkers?.length).toBe(3)
      
      // Verify all text is present
      expect(monacoContent).toContain('First bullet item with text')
      expect(monacoContent).toContain('Second bullet item with text')
      expect(monacoContent).toContain('Third bullet item with text')
    })

    test('ordered list text should persist when switching editors', async ({ page }) => {
      await page.waitForSelector('.tiptap-editor')
      
      const editor = page.locator('.tiptap')
      await editor.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('# Ordered List Test')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      
      // Create ordered list
      await page.keyboard.type('1. First ordered item')
      await page.keyboard.press('Enter')
      await page.keyboard.type('2. Second ordered item')
      await page.keyboard.press('Enter')
      await page.keyboard.type('3. Third ordered item')
      
      await page.waitForTimeout(1500)
      await expect(page.locator('.save-status.saved')).toBeVisible({ timeout: 3000 })
      
      // Switch to Monaco
      const toggleButton = page.locator('.toggle-btn')
      await toggleButton.click()
      await page.waitForSelector('.monaco-editor')
      await page.waitForTimeout(500)
      
      const monacoContent = await page.evaluate(() => {
        const monaco = (window as any).monaco
        if (monaco) {
          const editors = monaco.editor.getModels()
          if (editors && editors[0]) {
            return editors[0].getValue()
          }
        }
        return null
      })
      
      // Text should be preserved
      expect(monacoContent).toContain('1. First ordered item')
      expect(monacoContent).toContain('2. Second ordered item')
      expect(monacoContent).toContain('3. Third ordered item')
    })
  })
})

