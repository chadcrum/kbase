import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ViewerToolbar from './ViewerToolbar.vue'

// Mock Vue Router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock the vault store
vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn(() => ({
    isSidebarCollapsed: false,
    toggleSidebar: vi.fn()
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

  it('renders search and logout buttons', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    expect(wrapper.text()).toContain('Search')
    expect(wrapper.text()).toContain('Logout')
    expect(wrapper.find('.search-btn').exists()).toBe(true)
    expect(wrapper.find('.logout-btn').exists()).toBe(true)
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

  it('handles logout button click', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md'
      }
    })

    await wrapper.find('.logout-btn').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})

