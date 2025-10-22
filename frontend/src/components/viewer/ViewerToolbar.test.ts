import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ViewerToolbar from './ViewerToolbar.vue'

describe('ViewerToolbar', () => {
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

  it('renders editor and preview toggle buttons', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const buttons = wrapper.findAll('.toggle-btn')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toContain('Editor')
    expect(buttons[1].text()).toContain('Preview')
  })

  it('applies active class to editor button when in editor mode', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const buttons = wrapper.findAll('.toggle-btn')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].classes()).not.toContain('active')
  })

  it('applies active class to preview button when in preview mode', () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'preview'
      }
    })

    const buttons = wrapper.findAll('.toggle-btn')
    expect(buttons[0].classes()).not.toContain('active')
    expect(buttons[1].classes()).toContain('active')
  })

  it('emits update:viewMode when editor button is clicked', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'preview'
      }
    })

    const buttons = wrapper.findAll('.toggle-btn')
    await buttons[0].trigger('click')

    expect(wrapper.emitted('update:viewMode')).toBeTruthy()
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual(['editor'])
  })

  it('emits update:viewMode when preview button is clicked', async () => {
    const wrapper = mount(ViewerToolbar, {
      props: {
        fileName: 'test.md',
        viewMode: 'editor'
      }
    })

    const buttons = wrapper.findAll('.toggle-btn')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:viewMode')).toBeTruthy()
    expect(wrapper.emitted('update:viewMode')?.[0]).toEqual(['preview'])
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

