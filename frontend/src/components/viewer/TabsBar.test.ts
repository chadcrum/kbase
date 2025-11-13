import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TabsBar from './TabsBar.vue'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'

// Mock stores
vi.mock('@/stores/tabs', () => ({
  useTabsStore: vi.fn()
}))

vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

describe('TabsBar', () => {
  let mockTabsStore: any
  let mockVaultStore: any

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
      clearSelection: vi.fn()
    }

    ;(useTabsStore as any).mockReturnValue(mockTabsStore)
    ;(useVaultStore as any).mockReturnValue(mockVaultStore)
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
})
