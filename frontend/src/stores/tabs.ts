import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Tab {
  id: string
  path: string
  title: string
}

const TABS_KEY = 'kbase_tabs'
const ACTIVE_TAB_KEY = 'kbase_active_tab'

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const setLocalStorageItem = (key: string, value: string) => {
  try {
    getLocalStorage()?.setItem(key, value)
  } catch {
    // Ignore storage errors (e.g., private mode, quota exceeded)
  }
}

const removeLocalStorageItem = (key: string) => {
  try {
    getLocalStorage()?.removeItem(key)
  } catch {
    // Ignore storage errors
  }
}

const getLocalStorageItem = (key: string): string | null => {
  try {
    return getLocalStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

const readTabsFromStorage = (): Tab[] => {
  const stored = getLocalStorageItem(TABS_KEY)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    // Validate the structure
    if (Array.isArray(parsed)) {
      return parsed.filter(tab =>
        tab &&
        typeof tab.id === 'string' &&
        typeof tab.path === 'string' &&
        typeof tab.title === 'string'
      )
    }
  } catch {
    // Invalid JSON, return empty array
  }

  return []
}

const readActiveTabFromStorage = (): string | null => {
  const stored = getLocalStorageItem(ACTIVE_TAB_KEY)
  return stored || null
}

const saveTabsToStorage = (tabs: Tab[]) => {
  try {
    setLocalStorageItem(TABS_KEY, JSON.stringify(tabs))
  } catch {
    // Ignore storage errors
  }
}

const saveActiveTabToStorage = (activeTabId: string | null) => {
  if (activeTabId) {
    setLocalStorageItem(ACTIVE_TAB_KEY, activeTabId)
  } else {
    removeLocalStorageItem(ACTIVE_TAB_KEY)
  }
}

export const useTabsStore = defineStore('tabs', () => {
  // State - initialize with persisted data
  const tabs = ref<Tab[]>(readTabsFromStorage())
  const activeTabId = ref<string | null>(readActiveTabFromStorage())

  // Getters
  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value) || null
  })

  const activeTabPath = computed(() => {
    return activeTab.value?.path || null
  })

  // Helper to extract title from path
  const getTitleFromPath = (path: string): string => {
    const parts = path.split('/')
    const filename = parts[parts.length - 1]
    
    // Remove .md extension if present
    if (filename.endsWith('.md')) {
      return filename.slice(0, -3)
    }
    
    return filename || 'Untitled'
  }

  // Helper to generate unique ID for tab
  const generateTabId = (path: string): string => {
    return `tab-${path.replace(/\//g, '-')}`
  }

  // Actions
  const getTabByPath = (path: string): Tab | undefined => {
    return tabs.value.find(tab => tab.path === path)
  }

  const openTab = (path: string): Tab => {
    // Check if tab already exists
    const existingTab = getTabByPath(path)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return existingTab
    }

    // Always create a new tab
    const newTab: Tab = {
      id: generateTabId(path),
      path,
      title: getTitleFromPath(path)
    }
    tabs.value.push(newTab)
    setActiveTab(newTab.id)
    saveTabsToStorage(tabs.value)
    return newTab
  }

  const closeTab = (id: string): void => {
    const index = tabs.value.findIndex(tab => tab.id === id)
    if (index === -1) return

    const wasActive = activeTabId.value === id
    tabs.value.splice(index, 1)

    // If closed tab was active, activate another tab
    if (wasActive) {
      if (tabs.value.length > 0) {
        // Activate the tab at the same index, or the last tab if at end
        const newIndex = Math.min(index, tabs.value.length - 1)
        setActiveTab(tabs.value[newIndex].id)
      } else {
        activeTabId.value = null
      }
    }

    saveTabsToStorage(tabs.value)
  }


  const setActiveTab = (id: string | null): void => {
    activeTabId.value = id
    saveActiveTabToStorage(id)
  }

  const clearAllTabs = (): void => {
    tabs.value = []
    activeTabId.value = null
    saveTabsToStorage([])
    saveActiveTabToStorage(null)
  }

  const reorderTabs = (fromIndex: number, toIndex: number): void => {
    const tabsArray = tabs.value
    if (fromIndex < 0 || fromIndex >= tabsArray.length || toIndex < 0 || toIndex >= tabsArray.length) {
      return
    }

    // Move the tab from fromIndex to toIndex
    const [movedTab] = tabsArray.splice(fromIndex, 1)
    tabsArray.splice(toIndex, 0, movedTab)

    saveTabsToStorage(tabs.value)
  }

  // Function to clean up tabs that reference non-existent files
  const cleanupInvalidTabs = async (existingFiles: string[]): Promise<void> => {
    const validTabs = tabs.value.filter(tab => existingFiles.includes(tab.path))
    if (validTabs.length !== tabs.value.length) {
      tabs.value = validTabs
      saveTabsToStorage(tabs.value)

      // If active tab was removed, clear it
      if (activeTabId.value && !validTabs.find(tab => tab.id === activeTabId.value)) {
        activeTabId.value = validTabs.length > 0 ? validTabs[0].id : null
        saveActiveTabToStorage(activeTabId.value)
      }
    }
  }

  return {
    // State
    tabs,
    activeTabId,
    // Getters
    activeTab,
    activeTabPath,
    // Actions
    openTab,
    closeTab,
    setActiveTab,
    getTabByPath,
    clearAllTabs,
    reorderTabs,
    cleanupInvalidTabs,
    // Helpers (exposed for use in other stores)
    getTitleFromPath
  }
})

