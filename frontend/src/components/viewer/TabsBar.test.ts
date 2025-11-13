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

  it('renders tabs dropdown button', () => {
    const wrapper = mount(TabsBar)
    expect(wrapper.find('.tabs-dropdown-btn').exists()).toBe(true)
  })

  it('toggles tabs dropdown on button click', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    // Initially dropdown should be closed (check document body for Teleported content)
    expect(document.body.querySelector('.tabs-dropdown')).toBeNull()
    
    // Click to open
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.tabs-dropdown')).toBeTruthy()
    
    // Click again to close
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.tabs-dropdown')).toBeNull()
  })

  it('shows all tabs in dropdown', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const dropdown = document.body.querySelector('.tabs-dropdown')
    expect(dropdown).toBeTruthy()
    const dropdownItems = dropdown?.querySelectorAll('.tabs-dropdown-item-wrapper')
    expect(dropdownItems?.length).toBe(3)
  })

  it('shows empty message when no tabs', async () => {
    mockTabsStore.tabs = []
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const emptyMessage = document.body.querySelector('.tabs-dropdown-empty')
    expect(emptyMessage).toBeTruthy()
    expect(emptyMessage?.textContent).toBe('No tabs open')
  })

  it('highlights active tab in dropdown', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const activeItem = document.body.querySelector('.tabs-dropdown-item-wrapper.is-active')
    expect(activeItem).toBeTruthy()
    expect(activeItem?.textContent).toContain('Test 1')
  })

  it('shows pin icon for pinned tabs in dropdown', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const dropdownItems = document.body.querySelectorAll('.tabs-dropdown-item-wrapper')
    const pinnedItem = dropdownItems[1] // tab2 is pinned
    const icon = pinnedItem.querySelector('.tabs-dropdown-item-icon')
    expect(icon?.textContent).toBe('📌')
  })

  it('shows file icon for unpinned tabs in dropdown', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const dropdownItems = document.body.querySelectorAll('.tabs-dropdown-item-wrapper')
    const unpinnedItem = dropdownItems[0] // tab1 is unpinned
    const icon = unpinnedItem.querySelector('.tabs-dropdown-item-icon')
    expect(icon?.textContent).toBe('📄')
  })

  it('handles tab selection from dropdown', async () => {
    mockTabsStore.setActiveTab = vi.fn()
    mockVaultStore.loadNote = vi.fn()
    
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0)) // Allow Teleport to render
    
    const dropdownItems = document.body.querySelectorAll('.tabs-dropdown-item-wrapper')
    const tabButton = dropdownItems[1].querySelector('.tabs-dropdown-item') as HTMLElement
    if (tabButton) {
      tabButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
    }
    
    expect(mockTabsStore.setActiveTab).toHaveBeenCalledWith('tab2')
    expect(mockVaultStore.loadNote).toHaveBeenCalledWith('/test2.md')
    expect(document.body.querySelector('.tabs-dropdown')).toBeNull() // Dropdown should close
  })

  it('renders close button for each tab in dropdown', async () => {
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    
    const closeButtons = document.body.querySelectorAll('.tabs-dropdown-item-close')
    expect(closeButtons.length).toBe(3)
  })

  it('handles closing tab from dropdown', async () => {
    mockTabsStore.closeTab = vi.fn()
    mockTabsStore.activeTabPath = '/test3.md'
    mockVaultStore.loadNote = vi.fn()
    
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0)) // Allow Teleport to render
    
    const dropdownItems = document.body.querySelectorAll('.tabs-dropdown-item-wrapper')
    const closeButton = dropdownItems[0].querySelector('.tabs-dropdown-item-close') as HTMLElement
    if (closeButton) {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
    }
    
    expect(mockTabsStore.closeTab).toHaveBeenCalledWith('tab1')
    expect(mockVaultStore.loadNote).toHaveBeenCalledWith('/test3.md')
  })

  it('closes dropdown when last tab is closed', async () => {
    mockTabsStore.tabs = [{ id: 'tab1', path: '/test1.md', title: 'Test 1', isPinned: false }]
    mockTabsStore.closeTab = vi.fn(() => {
      mockTabsStore.tabs = []
    })
    mockTabsStore.activeTabPath = null
    mockVaultStore.clearSelection = vi.fn()
    
    const wrapper = mount(TabsBar)
    const dropdownBtn = wrapper.find('.tabs-dropdown-btn')
    
    await dropdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0)) // Allow Teleport to render
    expect(document.body.querySelector('.tabs-dropdown')).toBeTruthy()
    
    const closeButton = document.body.querySelector('.tabs-dropdown-item-close') as HTMLElement
    if (closeButton) {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
    }
    
    expect(mockTabsStore.closeTab).toHaveBeenCalled()
    expect(mockVaultStore.clearSelection).toHaveBeenCalled()
    expect(document.body.querySelector('.tabs-dropdown')).toBeNull() // Dropdown should close
  })
})
