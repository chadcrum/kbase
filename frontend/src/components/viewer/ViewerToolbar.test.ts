import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ViewerToolbar from './ViewerToolbar.vue'

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

  it('displays saving status', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor',
        saveStatus: 'saving'
      }
    })

    expect(wrapper.text()).toContain('Saving...')
    expect(wrapper.find('.save-status').classes()).toContain('saving')
  })

  it('displays saved status', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor',
        saveStatus: 'saved'
      }
    })

    expect(wrapper.text()).toContain('Saved')
    expect(wrapper.find('.save-status').classes()).toContain('saved')
  })

  it('displays error status', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor',
        saveStatus: 'error'
      }
    })

    expect(wrapper.text()).toContain('Save failed')
    expect(wrapper.find('.save-status').classes()).toContain('error')
  })

  it('does not display save status when null', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor',
        saveStatus: null
      }
    })

    expect(wrapper.find('.save-status').exists()).toBe(false)
  })
})

