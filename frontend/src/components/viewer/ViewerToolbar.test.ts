import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ViewerToolbar from './ViewerToolbar.vue'

vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn(() => ({
    isSidebarCollapsed: false,
    toggleSidebar: vi.fn()
  }))
}))

vi.mock('@/stores/editor', () => ({
  useEditorStore: vi.fn(() => ({
    markdownEditor: 'milkdown',
    toggleMarkdownEditor: vi.fn()
  }))
}))

describe('ViewerToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders file name', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    expect(wrapper.text()).toContain('test.md')
  })

  it('renders file path when provided', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        filePath: 'folder/test.md'
      }
    })

    expect(wrapper.text()).toContain('folder/test.md')
  })

  it('renders icon-only search button', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    expect(wrapper.find('.search-btn').exists()).toBe(true)
    // Verify buttons are icon-only (no text labels)
    expect(wrapper.find('.search-btn').text()).toBe('🔍')
  })

  it('handles search button click', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    await wrapper.find('.search-btn').trigger('click')
    expect(wrapper.emitted('openSearch')).toBeTruthy()
  })
})

