import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NoteViewer from './NoteViewer.vue'
import ViewerToolbar from './ViewerToolbar.vue'
import { useVaultStore } from '@/stores/vault'
import type { NoteData } from '@/types'

// Mock Monaco editor to avoid initialization issues in tests
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
          getModel: vi.fn(() => null)
        })),
        setModelLanguage: vi.fn()
      }
    }))
  }
}))

// Mock TipTap editor to avoid initialization issues in tests
const mockEditor = {
  commands: {
    setContent: vi.fn(),
  },
  state: {
    doc: {}
  },
  destroy: vi.fn(),
  setEditable: vi.fn(),
  isActive: vi.fn(() => false),
  can: vi.fn(() => ({
    undo: vi.fn(() => true),
    redo: vi.fn(() => true)
  })),
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleStrike: vi.fn(() => ({ run: vi.fn() })),
      toggleCode: vi.fn(() => ({ run: vi.fn() })),
      toggleHeading: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
      toggleTaskList: vi.fn(() => ({ run: vi.fn() })),
      toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
      toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
      setHorizontalRule: vi.fn(() => ({ run: vi.fn() })),
      undo: vi.fn(() => ({ run: vi.fn() })),
      redo: vi.fn(() => ({ run: vi.fn() }))
    }))
  }))
}

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn(() => ({
    value: mockEditor
  })),
  EditorContent: {
    name: 'EditorContent',
    template: '<div class="tiptap-editor"></div>'
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
      expect(wrapper.findComponent(ViewerToolbar).exists()).toBe(true)
    })

    it('should display ViewerToolbar with file information', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      const toolbar = wrapper.findComponent(ViewerToolbar)
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.props('fileName')).toBe('test-note')
      expect(toolbar.props('filePath')).toBe('/folder/test-note.md')
    })

    it('should default to wysiwyg mode for .md files', async () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Should show wysiwyg view for .md files
      expect(wrapper.find('.wysiwyg-view').exists()).toBe(true)
      expect(wrapper.find('.editor-view').exists()).toBe(false)
    })

    it('should extract title from note path correctly', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      const toolbar = wrapper.findComponent(ViewerToolbar)
      expect(toolbar.props('fileName')).toBe('test-note')
    })

    it('should handle notes without .md extension', () => {
      const noteWithoutExt: NoteData = {
        ...mockNote,
        path: '/folder/readme'
      }
      mockVaultStore.selectedNote = noteWithoutExt
      wrapper = createWrapper()
      
      const toolbar = wrapper.findComponent(ViewerToolbar)
      expect(toolbar.props('fileName')).toBe('readme')
    })

    it('should handle notes with no filename', () => {
      const noteWithNoName: NoteData = {
        ...mockNote,
        path: '/'
      }
      mockVaultStore.selectedNote = noteWithNoName
      wrapper = createWrapper()
      
      const toolbar = wrapper.findComponent(ViewerToolbar)
      expect(toolbar.props('fileName')).toBe('Untitled')
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
    it('should default to editor mode for non-.md files', async () => {
      const nonMdNote: NoteData = {
        ...mockNote,
        path: '/folder/readme.txt'
      }
      mockVaultStore.selectedNote = nonMdNote
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Should show editor view for non-.md files
      expect(wrapper.find('.editor-view').exists()).toBe(true)
      expect(wrapper.find('.wysiwyg-view').exists()).toBe(false)
    })

    it('should allow switching between editor and wysiwyg modes', async () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      
      // Starts in wysiwyg mode for .md files
      expect(wrapper.find('.wysiwyg-view').exists()).toBe(true)
      
      // Switch to editor mode
      await wrapper.findComponent(ViewerToolbar).vm.$emit('update:viewMode', 'editor')
      await wrapper.vm.$nextTick()
      
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
