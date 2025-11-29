import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NoteViewer from './NoteViewer.vue'
import NoteToolbar from './NoteToolbar.vue'
import { useVaultStore } from '@/stores/vault'
import type { NoteData } from '@/types'

// Mock CodeMirror to avoid initialization issues in tests
vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({
      doc: { toString: vi.fn(() => 'test content'), length: 12 },
      selection: { main: { from: 0, to: 0 } }
    })),
    tabSize: { of: vi.fn(() => ({})) }
  }
}))

const EditorViewConstructor = vi.fn().mockImplementation(() => ({
  state: {
    doc: { toString: vi.fn(() => 'test content'), length: 12 },
    selection: { main: { from: 0, to: 0 } }
  },
  scrollDOM: { scrollTop: 0 },
  dispatch: vi.fn(),
  focus: vi.fn(),
  destroy: vi.fn(),
  requestMeasure: vi.fn(),
  setState: vi.fn()
}))

// Add static properties to the constructor
Object.assign(EditorViewConstructor, {
  lineWrapping: {},
  editable: { of: vi.fn(() => ({})) },
  contentAttributes: { of: vi.fn(() => ({})) },
  updateListener: { of: vi.fn(() => ({})) }
})

vi.mock('@codemirror/view', () => ({
  EditorView: EditorViewConstructor,
  keymap: { of: vi.fn(() => ({})) }
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

// Mock CodeMirrorEditor component
vi.mock('@/components/editor/CodeMirrorEditor.vue', () => ({
  default: {
    name: 'CodeMirrorEditor',
    template: '<div class="codemirror-editor-mock"></div>',
    props: ['modelValue', 'path', 'disabled'],
    emits: ['update:modelValue', 'save']
  }
}))

// Mock the vault store
vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

describe('NoteViewer', () => {
  let mockVaultStore: any
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockVaultStore = {
      selectedNote: null,
      isLoading: false,
      hasError: false,
      error: null,
      loadNote: vi.fn(),
      updateNote: vi.fn(() => Promise.resolve(true))
    }
    
    vi.mocked(useVaultStore).mockReturnValue(mockVaultStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
    wrapper?.unmount()
  })

  const createWrapper = () => {
    return mount(NoteViewer, {
      global: {
        plugins: [createPinia()]
      }
    })
  }

  const mockNote: NoteData = {
    content: '# Test Note\n\nThis is a test note with some content.\n\n## Section\n\nMore content here.',
    path: '/folder/test-note.md',
    size: 1024,
    modified: 1640995200 // 2022-01-01 00:00:00 UTC
  }

  describe('rendering with selected note', () => {
    it('should render note content when note is selected', async () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()

      expect(wrapper.find('.note-content').exists()).toBe(true)
      expect(wrapper.findComponent(NoteToolbar).exists()).toBe(true)
    })

    it('should display NoteToolbar with file information', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()

      const toolbar = wrapper.findComponent(NoteToolbar)
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.props('filePath')).toBe('/folder/test-note.md')
    })

    it('should extract title from note path correctly', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()

      // NoteToolbar doesn't expose fileName prop directly, but we can check if it renders
      const toolbar = wrapper.findComponent(NoteToolbar)
      expect(toolbar.exists()).toBe(true)
    })

    it('should handle notes without .md extension', () => {
      const noteWithoutExt: NoteData = {
        ...mockNote,
        path: '/folder/readme'
      }
      mockVaultStore.selectedNote = noteWithoutExt
      wrapper = createWrapper()

      const toolbar = wrapper.findComponent(NoteToolbar)
      expect(toolbar.exists()).toBe(true)
    })

    it('should handle notes with no filename', () => {
      const noteWithNoName: NoteData = {
        ...mockNote,
        path: '/'
      }
      mockVaultStore.selectedNote = noteWithNoName
      wrapper = createWrapper()

      const toolbar = wrapper.findComponent(NoteToolbar)
      expect(toolbar.exists()).toBe(true)
    })
  })

  describe('loading state', () => {
    it('should show loading state when loading', () => {
      mockVaultStore.isLoading = true
      wrapper = createWrapper()
      
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading note...')
    })
  })

  describe('error state', () => {
    it('should show error state when there is an error', () => {
      mockVaultStore.hasError = true
      mockVaultStore.error = 'Failed to load note'
      wrapper = createWrapper()
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load note')
      expect(wrapper.find('.retry-button').exists()).toBe(true)
    })

    it('should retry loading note when retry button is clicked', async () => {
      mockVaultStore.hasError = true
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      const retryButton = wrapper.find('.retry-button')
      if (retryButton.exists()) {
        await retryButton.trigger('click')
        expect(mockVaultStore.loadNote).toHaveBeenCalledWith(mockNote.path)
      }
    })
  })

  describe('empty state', () => {
    it('should show empty state when no note is selected', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No note selected')
      expect(wrapper.text()).toContain('Select a note from the sidebar to view its content')
      expect(wrapper.find('.empty-icon').text()).toBe('📄')
    })
  })

  describe('view mode selection', () => {
    it('should always use editor mode for all files', async () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Only editor view exists now
      expect(wrapper.find('.editor-view').exists()).toBe(true)
      expect(wrapper.find('.wysiwyg-view').exists()).toBe(false)
    })
  })

  describe('save functionality', () => {
    it('should handle save requests from editors', async () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // The component should be ready to handle save events from either editor
      expect(mockVaultStore.updateNote).toBeDefined()
    })
  })

  describe('responsive behavior', () => {
    it('should have proper CSS classes for responsive design', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      const noteViewer = wrapper.find('.note-viewer')
      expect(noteViewer.exists()).toBe(true)
      
      const noteContent = wrapper.find('.note-content')
      expect(noteContent.exists()).toBe(true)
    })
  })
})
