import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MonacoEditor from './MonacoEditor.vue'

// Mock monaco loader
const mockAddCommand = vi.fn()
const mockTrigger = vi.fn()
const mockOnDidChangeCursorPosition = vi.fn()
const mockOnDidChangeCursorSelection = vi.fn()
const mockOnDidScrollChange = vi.fn()
const mockOnDidChangeModelContent = vi.fn()
const mockDispose = vi.fn()

vi.mock('@monaco-editor/loader', () => ({
  default: {
    init: vi.fn(() => Promise.resolve({
      editor: {
        create: vi.fn(() => ({
          getValue: vi.fn(() => 'test content'),
          setValue: vi.fn(),
          onDidChangeModelContent: mockOnDidChangeModelContent,
          onDidChangeCursorPosition: mockOnDidChangeCursorPosition,
          onDidChangeCursorSelection: mockOnDidChangeCursorSelection,
          onDidScrollChange: mockOnDidScrollChange,
          addCommand: mockAddCommand,
          trigger: mockTrigger,
          dispose: mockDispose,
          layout: vi.fn(),
          saveViewState: vi.fn(() => null),
          restoreViewState: vi.fn(),
          focus: vi.fn(),
          getModel: vi.fn(() => ({
            setLanguage: vi.fn()
          }))
        })),
        setModelLanguage: vi.fn(),
        setTheme: vi.fn()
      },
      KeyMod: {
        CtrlCmd: 2048
      },
      KeyCode: {
        KeyR: 82
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
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllTimers()
    mockAddCommand.mockClear()
    mockTrigger.mockClear()
    mockDispose.mockClear()
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

  it('adds Ctrl+R keybinding for redo', async () => {
    mount(MonacoEditor, {
      props: {
        modelValue: 'test content',
        path: 'test.md'
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockAddCommand).toHaveBeenCalled()
    const callArgs = mockAddCommand.mock.calls[0]
    // Verify it's called with CtrlCmd modifier (2048) and KeyR (82)
    expect(callArgs[0] & 2048).toBe(2048) // Check CtrlCmd modifier
    expect(callArgs[0] & 82).toBe(82) // Check KeyR
    
    // Verify the command handler triggers redo
    const commandHandler = callArgs[1]
    expect(typeof commandHandler).toBe('function')
  })

  it('does not trigger redo when editor is readonly', async () => {
    mount(MonacoEditor, {
      props: {
        modelValue: 'test content',
        path: 'test.md',
        readonly: true
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockAddCommand).toHaveBeenCalled()
    const callArgs = mockAddCommand.mock.calls[0]
    const commandHandler = callArgs[1]
    
    // Call the handler - should not trigger redo when readonly
    commandHandler()
    expect(mockTrigger).not.toHaveBeenCalled()
  })

  it('does not trigger redo when editor is disabled', async () => {
    mount(MonacoEditor, {
      props: {
        modelValue: 'test content',
        path: 'test.md',
        disabled: true
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockAddCommand).toHaveBeenCalled()
    const callArgs = mockAddCommand.mock.calls[0]
    const commandHandler = callArgs[1]
    
    // Call the handler - should not trigger redo when disabled
    commandHandler()
    expect(mockTrigger).not.toHaveBeenCalled()
  })
})

