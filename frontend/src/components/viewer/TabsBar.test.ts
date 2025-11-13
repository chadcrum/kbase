import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TabsBar from './TabsBar.vue'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'

// Mock stores
vi.mock('@/stores/tabs', () => ({
  useTabsStore: vi.fn()
}))

vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

vi.mock('@/stores/editor', () => ({
  useEditorStore: vi.fn()
}))

describe('TabsBar', () => {
  let mockTabsStore: any
  let mockVaultStore: any
  let mockEditorStore: any

  beforeEach(() => {
    setActivePinia(createPinia())

    mockTabsStore = {
      tabs: [
        { id: 'tab1', path: '/test1.md', title: 'Test 1', isPinned: false },
        { id: 'tab2', path: '/test2.md', title: 'Test 2', isPinned: true },
        { id: 'tab3', path: '/test3.md', title: 'Test 3', isPinned: false }
      ],
      activeTabId: 'tab1',
      activeTabPath: '/test1.md',
      reorderTabs: vi.fn(),
      closeTab: vi.fn(),
      togglePinTab: vi.fn(),
      setActiveTab: vi.fn()
    }

    mockVaultStore = {
      isSidebarCollapsed: false,
      sidebarWidth: 300,
      loadNote: vi.fn(),
      clearSelection: vi.fn(),
      toggleSidebar: vi.fn()
    }

    mockEditorStore = {
      markdownEditor: 'milkdown',
      toggleMarkdownEditor: vi.fn()
    }

    ;(useTabsStore as any).mockReturnValue(mockTabsStore)
    ;(useVaultStore as any).mockReturnValue(mockVaultStore)
    ;(useEditorStore as any).mockReturnValue(mockEditorStore)
  })

  it('renders tabs correctly', () => {
    const wrapper = mount(TabsBar)
    expect(wrapper.exists()).toBe(true)

    // Check that tabs are rendered
    const tabs = wrapper.findAll('.tab')
    expect(tabs).toHaveLength(3)

    // Check active tab
    const activeTab = wrapper.find('.tab.is-active')
    expect(activeTab.exists()).toBe(true)
  })

  it('handles tab click', async () => {
    mockTabsStore.setActiveTab = vi.fn()
    mockVaultStore.loadNote = vi.fn()

    const wrapper = mount(TabsBar)
    const tab = wrapper.find('.tab')

    await tab.trigger('click')

    expect(mockTabsStore.setActiveTab).toHaveBeenCalled()
    expect(mockVaultStore.loadNote).toHaveBeenCalled()
  })

  it('handles tab close', async () => {
    mockTabsStore.closeTab = vi.fn()
    mockVaultStore.loadNote = vi.fn()

    const wrapper = mount(TabsBar)
    const closeButton = wrapper.find('.tab-close')

    await closeButton.trigger('click')

    expect(mockTabsStore.closeTab).toHaveBeenCalled()
  })

  it('handles tab double click for pinning', async () => {
    mockTabsStore.togglePinTab = vi.fn()

    const wrapper = mount(TabsBar)
    const tab = wrapper.find('.tab')

    await tab.trigger('dblclick')

    expect(mockTabsStore.togglePinTab).toHaveBeenCalled()
  })

  it('applies correct classes for pinned/unpinned tabs', () => {
    const wrapper = mount(TabsBar)

    const tabs = wrapper.findAll('.tab')
    const pinnedTab = tabs[1] // tab2 is pinned
    const unpinnedTab = tabs[0] // tab1 is unpinned

    expect(pinnedTab.classes()).toContain('is-pinned')
    expect(unpinnedTab.classes()).not.toContain('is-pinned')

    // Check italic styling
    const italicTitle = unpinnedTab.find('.tab-title.is-italic')
    expect(italicTitle.exists()).toBe(true)
  })

  it('makes tabs draggable', () => {
    const wrapper = mount(TabsBar)

    const tabs = wrapper.findAll('.tab')
    tabs.forEach(tab => {
      expect(tab.attributes('draggable')).toBe('true')
    })
  })

  it('renders sidebar toggle button', () => {
    const wrapper = mount(TabsBar)
    expect(wrapper.find('.sidebar-toggle-btn').exists()).toBe(true)
  })

  it('handles sidebar toggle click', async () => {
    const wrapper = mount(TabsBar)
    const sidebarToggle = wrapper.find('.sidebar-toggle-btn')
    
    await sidebarToggle.trigger('click')
    
    expect(mockVaultStore.toggleSidebar).toHaveBeenCalled()
  })

  it('renders search button', () => {
    const wrapper = mount(TabsBar)
    expect(wrapper.find('.search-btn').exists()).toBe(true)
  })

  it('handles search button click', async () => {
    const wrapper = mount(TabsBar, {
      props: {
        filePath: 'test.md'
      }
    })
    const searchBtn = wrapper.find('.search-btn')
    
    await searchBtn.trigger('click')
    
    expect(wrapper.emitted('openSearch')).toBeTruthy()
  })

  it('renders editor toggle for markdown files', () => {
    const wrapper = mount(TabsBar, {
      props: {
        filePath: 'test.md'
      }
    })
    expect(wrapper.find('.editor-toggle-btn').exists()).toBe(true)
  })

  it('does not render editor toggle for non-markdown files', () => {
    const wrapper = mount(TabsBar, {
      props: {
        filePath: 'test.txt'
      }
    })
    expect(wrapper.find('.editor-toggle-btn').exists()).toBe(false)
  })

  it('handles editor toggle click', async () => {
    const wrapper = mount(TabsBar, {
      props: {
        filePath: 'test.md'
      }
    })
    const editorToggle = wrapper.find('.editor-toggle-btn')
    
    await editorToggle.trigger('click')
    
    expect(mockEditorStore.toggleMarkdownEditor).toHaveBeenCalled()
  })
})
