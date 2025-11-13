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

  it('renders file path when provided', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        filePath: 'folder/test.md'
      }
    })

    expect(wrapper.text()).toContain('folder/test.md')
  })

  it('does not render file path when not provided', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    expect(wrapper.find('.file-path').exists()).toBe(false)
  })
})

