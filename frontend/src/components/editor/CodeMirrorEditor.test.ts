import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CodeMirrorEditor from './CodeMirrorEditor.vue'

// Mock CodeMirror
const mockDispatch = vi.fn()
const mockFocus = vi.fn()
const mockDestroy = vi.fn()
const mockRequestMeasure = vi.fn()

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn((config) => ({
      doc: {
        toString: vi.fn(() => config.doc || ''),
        length: (config.doc || '').length
      },
      selection: {
        main: {
          from: 0,
          to: 0
        }
      }
    })),
    tabSize: {
      of: vi.fn(() => ({}))
    }
  }
}))

const EditorViewConstructor = vi.fn().mockImplementation(() => ({
  state: {
    doc: {
      toString: vi.fn(() => 'test content'),
      length: 12
    },
    selection: {
      main: {
        from: 0,
        to: 0
      }
    }
  },
  scrollDOM: {
    scrollTop: 0
  },
  dispatch: mockDispatch,
  focus: mockFocus,
  destroy: mockDestroy,
  requestMeasure: mockRequestMeasure,
  setState: vi.fn()
}))

// Add static properties to the constructor
Object.assign(EditorViewConstructor, {
  lineWrapping: {},
  editable: {
    of: vi.fn(() => ({}))
  },
  contentAttributes: {
    of: vi.fn(() => ({}))
  },
  updateListener: {
    of: vi.fn(() => ({}))
  }
})

vi.mock('@codemirror/view', () => ({
  EditorView: EditorViewConstructor,
  keymap: {
    of: vi.fn(() => ({}))
  }
}))

vi.mock('@codemirror/commands', () => ({
  indentWithTab: {}
}))

vi.mock('@codemirror/search', () => ({
  search: vi.fn(() => ({})),
  searchKeymap: []
}))

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}))

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = ResizeObserverMock as any

describe('CodeMirrorEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    mockDispatch.mockClear()
    mockFocus.mockClear()
    mockDestroy.mockClear()
  })

  it('renders editor container', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: 'test content',
        path: 'test.md'
      }
    })

    expect(wrapper.find('.codemirror-editor-container').exists()).toBe(true)
  })

  it('accepts modelValue prop', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: 'initial content',
        path: 'test.md'
      }
    })

    expect(wrapper.props('modelValue')).toBe('initial content')
  })

  it('accepts path prop', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: '',
        path: 'test.md'
      }
    })

    expect(wrapper.props('path')).toBe('test.md')
  })

  it('accepts readonly prop', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: '',
        path: 'test.md',
        readonly: true
      }
    })

    expect(wrapper.props('readonly')).toBe(true)
  })

  it('exposes focus method', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: 'test',
        path: 'test.md'
      }
    })

    expect(typeof wrapper.vm.focus).toBe('function')
  })

  it('handles disabled state', () => {
    const wrapper = mount(CodeMirrorEditor, {
      props: {
        modelValue: 'test',
        path: 'test.md',
        disabled: true
      }
    })

    expect(wrapper.props('disabled')).toBe(true)
  })
})

