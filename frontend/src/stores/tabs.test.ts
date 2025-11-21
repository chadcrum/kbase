import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTabsStore } from './tabs'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('TabsStore', () => {
  let tabsStore: ReturnType<typeof useTabsStore>

  beforeEach(() => {
    setActivePinia(createPinia())

    // Reset localStorage mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  describe('Initialization', () => {
    it('should initialize with empty state when no persisted data', () => {
      tabsStore = useTabsStore()
      expect(tabsStore.tabs).toEqual([])
      expect(tabsStore.activeTabId).toBeNull()
    })

    it('should initialize with persisted tabs data', () => {
      const mockTabs = [
        { id: 'tab1', path: '/test1.md', title: 'Test 1' },
        { id: 'tab2', path: '/test2.md', title: 'Test 2' },
      ]

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kbase_tabs') return JSON.stringify(mockTabs)
        if (key === 'kbase_active_tab') return 'tab1'
        return null
      })

      // Create new store instance to test initialization
      const newStore = useTabsStore()
      expect(newStore.tabs).toEqual(mockTabs)
      expect(newStore.activeTabId).toBe('tab1')
    })

    it('should handle invalid persisted data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kbase_tabs') return 'invalid json'
        return null
      })

      const newStore = useTabsStore()
      expect(newStore.tabs).toEqual([])
    })
  })

  describe('Tab Operations', () => {
    beforeEach(() => {
      tabsStore = useTabsStore()
    })

    it('should persist tabs when opening a new tab', () => {
      tabsStore.openTab('/test.md')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kbase_tabs',
        expect.stringContaining('test.md')
      )
    })

    it('should persist active tab when setting active tab', () => {
      tabsStore.setActiveTab('tab1')

      expect(localStorageMock.setItem).toHaveBeenCalledWith('kbase_active_tab', 'tab1')
    })

    it('should persist tabs when closing a tab', () => {
      // First open a tab
      tabsStore.openTab('/test.md')

      // Reset mock to check subsequent calls
      vi.clearAllMocks()

      // Close the tab
      const tabId = tabsStore.tabs[0].id
      tabsStore.closeTab(tabId)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('kbase_tabs', '[]')
    })

    it('should persist tabs when reordering', () => {
      // Open first tab
      tabsStore.openTab('/test1.md')
      // Reset mock
      vi.clearAllMocks()

      // Open second tab (should create new tab)
      tabsStore.openTab('/test2.md')

      // Reset mock again
      vi.clearAllMocks()

      // Now reorder the two tabs
      tabsStore.reorderTabs(0, 1)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kbase_tabs',
        expect.any(String)
      )
    })

    it('should clear persisted data when clearing all tabs', () => {
      tabsStore.openTab('/test.md')
      tabsStore.clearAllTabs()

      expect(localStorageMock.setItem).toHaveBeenCalledWith('kbase_tabs', '[]')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('kbase_active_tab')
    })
  })

  describe('Cleanup', () => {
    it('should remove tabs referencing non-existent files', async () => {
      // Set up initial tabs
      const mockTabs = [
        { id: 'tab1', path: '/existing.md', title: 'Existing' },
        { id: 'tab2', path: '/deleted.md', title: 'Deleted' },
      ]

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kbase_tabs') return JSON.stringify(mockTabs)
        return null
      })

      const newStore = useTabsStore()
      await newStore.cleanupInvalidTabs(['/existing.md', '/another.md'])

      expect(newStore.tabs).toHaveLength(1)
      expect(newStore.tabs[0].path).toBe('/existing.md')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
})
