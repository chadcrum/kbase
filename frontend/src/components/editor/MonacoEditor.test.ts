import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MonacoEditor from './MonacoEditor.vue'

// Mock monaco loader
vi.mock('@monaco-editor/loader', () => ({
  default: {
    init: vi.fn(() => Promise.resolve({
      editor: {
        create: vi.fn(() => ({
          getValue: vi.fn(() => 'test content'),
          setValue: vi.fn(),
          onDidChangeModelContent: vi.fn(),
          dispose: vi.fn(),
          layout: vi.fn(),
          getModel: vi.fn(() => ({
            setLanguage: vi.fn()
          }))
        })),
        setModelLanguage: vi.fn()
      }
    }))
  }
}))

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = ResizeObserverMock as any

describe('MonacoEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders editor container', () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'test content',
        path: 'test.md'
      }
    })

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true)
  })

  it('accepts modelValue prop', () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial content',
        path: 'test.md'
      }
    })

    expect(wrapper.props('modelValue')).toBe('initial content')
  })

  it('accepts path prop', () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: '',
        path: 'test.md'
      }
    })

    expect(wrapper.props('path')).toBe('test.md')
  })

  it('accepts readonly prop', () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: '',
        path: 'test.md',
        readonly: true
      }
    })

    expect(wrapper.props('readonly')).toBe(true)
  })

  it('emits update:modelValue when content changes', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial',
        path: 'test.md'
      }
    })

    // Simulate content change by emitting the event
    await wrapper.vm.$emit('update:modelValue', 'new content')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new content'])
  })

  it('emits save event', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'content',
        path: 'test.md'
      }
    })

    await wrapper.vm.$emit('save', 'saved content')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]).toEqual(['saved content'])
  })
})

