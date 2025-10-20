import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NoteViewer from './NoteViewer.vue'
import { useVaultStore } from '@/stores/vault'
import type { NoteData } from '@/types'

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
      loadNote: vi.fn()
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
    it('should render note content when note is selected', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      expect(wrapper.find('.note-content').exists()).toBe(true)
      expect(wrapper.find('.note-title').text()).toBe('test-note')
      expect(wrapper.find('.note-text').text()).toBe(mockNote.content)
    })

    it('should display note metadata correctly', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      const metadata = wrapper.find('.note-metadata')
      expect(metadata.exists()).toBe(true)
      
      // Check path
      expect(wrapper.text()).toContain('Path:')
      expect(wrapper.text()).toContain('/folder/test-note.md')
      
      // Check size (should be formatted)
      expect(wrapper.text()).toContain('Size:')
      expect(wrapper.text()).toContain('1 KB')
      
      // Check modified date
      expect(wrapper.text()).toContain('Modified:')
    })

    it('should extract title from note path correctly', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      expect(wrapper.find('.note-title').text()).toBe('test-note')
    })

    it('should handle notes without .md extension', () => {
      const noteWithoutExt: NoteData = {
        ...mockNote,
        path: '/folder/readme'
      }
      mockVaultStore.selectedNote = noteWithoutExt
      wrapper = createWrapper()
      
      expect(wrapper.find('.note-title').text()).toBe('readme')
    })

    it('should handle notes with no filename', () => {
      const noteWithNoName: NoteData = {
        ...mockNote,
        path: '/'
      }
      mockVaultStore.selectedNote = noteWithNoName
      wrapper = createWrapper()
      
      expect(wrapper.find('.note-title').text()).toBe('Untitled')
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

  describe('utility functions', () => {
    it('should format file sizes correctly', () => {
      mockVaultStore.selectedNote = { ...mockNote, size: 0 }
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('0 B')

      wrapper.unmount()
      
      mockVaultStore.selectedNote = { ...mockNote, size: 1024 }
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('1 KB')

      wrapper.unmount()
      
      mockVaultStore.selectedNote = { ...mockNote, size: 1024 * 1024 }
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('1 MB')
    })

    it('should format dates correctly', () => {
      mockVaultStore.selectedNote = mockNote
      wrapper = createWrapper()
      
      // The exact format depends on locale, but it should contain some recognizable date/time parts
      const dateText = wrapper.text()
      expect(dateText).toContain('Modified:')
      // Check that it's not showing the raw timestamp
      expect(dateText).not.toContain('1640995200')
    })
  })

  describe('content display', () => {
    it('should preserve whitespace and formatting in note content', () => {
      const noteWithFormatting: NoteData = {
        ...mockNote,
        content: 'Line 1\n\nLine 2\n    Indented line'
      }
      mockVaultStore.selectedNote = noteWithFormatting
      wrapper = createWrapper()
      
      const noteText = wrapper.find('.note-text')
      expect(noteText.text()).toBe(noteWithFormatting.content)
    })

    it('should handle empty note content', () => {
      const emptyNote: NoteData = {
        ...mockNote,
        content: ''
      }
      mockVaultStore.selectedNote = emptyNote
      wrapper = createWrapper()
      
      const noteText = wrapper.find('.note-text')
      expect(noteText.text()).toBe('')
    })

    it('should handle very long note content', () => {
      const longNote: NoteData = {
        ...mockNote,
        content: 'A'.repeat(10000)
      }
      mockVaultStore.selectedNote = longNote
      wrapper = createWrapper()
      
      const noteText = wrapper.find('.note-text')
      expect(noteText.text()).toBe(longNote.content)
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
