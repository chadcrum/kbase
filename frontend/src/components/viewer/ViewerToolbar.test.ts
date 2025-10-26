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
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    expect(wrapper.text()).toContain('test.md')
  })

  it('renders file path when provided', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        filePath: 'folder/test.md',
        viewMode: 'editor'
      }
    })

    expect(wrapper.text()).toContain('folder/test.md')
  })

  it('renders single toggle button with icon', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const button = wrapper.find('.toggle-btn')
    expect(button.exists()).toBe(true)
    expect(button.find('.icon-text').exists()).toBe(true)
  })

  it('shows </> icon when in editor mode', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const iconText = wrapper.find('.icon-text')
    expect(iconText.text()).toBe('</>')
  })

  it('shows Md icon when in wysiwyg mode', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'wysiwyg'
      }
    })

    const iconText = wrapper.find('.icon-text')
    expect(iconText.text()).toBe('Md')
  })

  it('toggles from wysiwyg to editor when clicked', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'wysiwyg'
      }
    })

    const button = wrapper.find('.toggle-btn')
    await button.trigger('click')

    expect(wrapper.emitted('update:viewMode')).toBeTruthy()
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual(['editor'])
  })

  it('toggles from editor to wysiwyg when clicked', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const button = wrapper.find('.toggle-btn')
    await button.trigger('click')

    expect(wrapper.emitted('update:viewMode')).toBeTruthy()
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual(['wysiwyg'])
  })

  it('renders search and logout buttons', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
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
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    await wrapper.find('.search-btn').trigger('click')
    expect(wrapper.emitted('openSearch')).toBeTruthy()
  })

  it('handles logout button click', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    await wrapper.find('.logout-btn').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})

