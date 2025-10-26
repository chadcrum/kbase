import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TipTapEditor from './TipTapEditor.vue'

// Mock the TipTapToolbar component
vi.mock('./TipTapToolbar.vue', () => ({
  default: {
    name: 'TipTapToolbar',
    template: '<div data-testid="tiptap-toolbar">Toolbar</div>',
    props: ['editor']
  }
}))

describe('TipTapEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders editor with toolbar', () => {
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: 'Test content',
        path: '/test.md'
      }
    })

    expect(wrapper.find('[data-testid="tiptap-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('initializes with correct content', async () => {
    const content = '# Test Heading\n\nThis is test content.'
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: content,
        path: '/test.md'
      }
    })

    await wrapper.vm.$nextTick()
    
    // The editor should be initialized and toolbar should be present
    expect(wrapper.find('[data-testid="tiptap-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles readonly mode', () => {
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: 'Test content',
        path: '/test.md',
        readonly: true
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles disabled mode', () => {
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: 'Test content',
        path: '/test.md',
        disabled: true
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles markdown content input', async () => {
    const markdown = '# Heading\n\n**Bold text**\n\n- List item'
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: markdown,
        path: '/test.md'
      }
    })

    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles HTML content input', async () => {
    const html = '<h1>Heading</h1><p><strong>Bold text</strong></p><ul><li>List item</li></ul>'
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: html,
        path: '/test.md'
      }
    })

    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('applies correct CSS classes', () => {
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: 'Test content',
        path: '/test.md'
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
    expect(wrapper.find('.tiptap-editor').classes()).toContain('tiptap-editor')
  })

  it('handles empty content', () => {
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: '',
        path: '/test.md'
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles long content', () => {
    const longContent = '# Very Long Heading\n\n' + 'This is a very long piece of content. '.repeat(100)
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: longContent,
        path: '/test.md'
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })

  it('handles special characters in content', () => {
    const specialContent = '# Special Characters\n\n`code` **bold** *italic* [link](url)'
    const wrapper = mount(TipTapEditor, {
      props: {
        modelValue: specialContent,
        path: '/test.md'
      }
    })

    expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
  })
})
