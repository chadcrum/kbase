import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore } from './vault'
import { apiClient } from '@/api/client'
import type { FileTreeNode, NoteData } from '@/types'

// Mock the API client
vi.mock('@/api/client', () => ({
  apiClient: {
    getNotes: vi.fn(),
    getNote: vi.fn()
  }
}))

const mockedApiClient = vi.mocked(apiClient)

describe('VaultStore', () => {
  let vaultStore: ReturnType<typeof useVaultStore>

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    vaultStore = useVaultStore()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(vaultStore.fileTree).toBeNull()
      expect(vaultStore.selectedNote).toBeNull()
      expect(vaultStore.isLoading).toBe(false)
      expect(vaultStore.error).toBeNull()
      expect(vaultStore.expandedPaths.size).toBe(0)
      expect(vaultStore.hasError).toBe(false)
      expect(vaultStore.isNoteSelected).toBe(false)
      expect(vaultStore.selectedNotePath).toBeNull()
    })
  })

  describe('loadFileTree', () => {
    it('should load file tree successfully', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          {
            name: 'note1.md',
            path: '/note1.md',
            type: 'file'
          }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)

      const result = await vaultStore.loadFileTree()

      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(vaultStore.fileTree).toEqual(mockTree)
      expect(vaultStore.error).toBeNull()
      expect(vaultStore.isLoading).toBe(false)
    })

    it('should handle file tree loading failure', async () => {
      const error = { response: { data: { detail: 'Unauthorized' } } }
      mockedApiClient.getNotes.mockRejectedValue(error)

      const result = await vaultStore.loadFileTree()

      expect(result).toBe(false)
      expect(vaultStore.fileTree).toBeNull()
      expect(vaultStore.error).toBe('Unauthorized')
      expect(vaultStore.isLoading).toBe(false)
    })

    it('should handle file tree loading failure without response data', async () => {
      const error = new Error('Network error')
      mockedApiClient.getNotes.mockRejectedValue(error)

      const result = await vaultStore.loadFileTree()

      expect(result).toBe(false)
      expect(vaultStore.error).toBe('Failed to load file tree')
      expect(vaultStore.isLoading).toBe(false)
    })

    it('should set loading state during file tree loading', async () => {
      let resolveNotes: (value: any) => void
      const notesPromise = new Promise(resolve => {
        resolveNotes = resolve
      })
      mockedApiClient.getNotes.mockReturnValue(notesPromise)

      const loadPromise = vaultStore.loadFileTree()
      
      expect(vaultStore.isLoading).toBe(true)
      
      resolveNotes!({
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      })
      
      await loadPromise
      
      expect(vaultStore.isLoading).toBe(false)
    })
  })

  describe('loadNote', () => {
    it('should load note successfully', async () => {
      const mockNote: NoteData = {
        content: '# Test Note\nThis is a test.',
        path: '/test.md',
        size: 25,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      const result = await vaultStore.loadNote('/test.md')

      expect(mockedApiClient.getNote).toHaveBeenCalledWith('/test.md')
      expect(result).toBe(true)
      expect(vaultStore.selectedNote).toEqual(mockNote)
      expect(vaultStore.error).toBeNull()
      expect(vaultStore.isLoading).toBe(false)
    })

    it('should handle note loading failure', async () => {
      const error = { response: { data: { detail: 'Note not found' } } }
      mockedApiClient.getNote.mockRejectedValue(error)

      const result = await vaultStore.loadNote('/nonexistent.md')

      expect(result).toBe(false)
      expect(vaultStore.selectedNote).toBeNull()
      expect(vaultStore.error).toBe('Note not found')
      expect(vaultStore.isLoading).toBe(false)
    })

    it('should return false for empty path', async () => {
      const result = await vaultStore.loadNote('')

      expect(result).toBe(false)
      expect(mockedApiClient.getNote).not.toHaveBeenCalled()
    })
  })

  describe('selectNote', () => {
    it('should select and load a note', async () => {
      const mockNote: NoteData = {
        content: '# Test Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      vaultStore.selectNote('/test.md')

      // Wait for the async loadNote to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockedApiClient.getNote).toHaveBeenCalledWith('/test.md')
      expect(vaultStore.selectedNote).toEqual(mockNote)
    })

    it('should not reload if same note is selected', async () => {
      const mockNote: NoteData = {
        content: '# Test Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      vaultStore.selectedNote = mockNote

      vaultStore.selectNote('/test.md')

      expect(mockedApiClient.getNote).not.toHaveBeenCalled()
    })
  })

  describe('clearSelection', () => {
    it('should clear selected note and error', () => {
      vaultStore.selectedNote = {
        content: '# Test',
        path: '/test.md',
        size: 10,
        modified: 1234567890
      }
      vaultStore.error = 'Some error'

      vaultStore.clearSelection()

      expect(vaultStore.selectedNote).toBeNull()
      expect(vaultStore.error).toBeNull()
    })
  })

  describe('toggleExpanded', () => {
    it('should expand a path when not expanded', () => {
      expect(vaultStore.isExpanded('/folder')).toBe(false)

      vaultStore.toggleExpanded('/folder')

      expect(vaultStore.isExpanded('/folder')).toBe(true)
    })

    it('should collapse a path when expanded', () => {
      vaultStore.expandedPaths.add('/folder')
      expect(vaultStore.isExpanded('/folder')).toBe(true)

      vaultStore.toggleExpanded('/folder')

      expect(vaultStore.isExpanded('/folder')).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      vaultStore.error = 'Some error'
      
      vaultStore.clearError()
      
      expect(vaultStore.error).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should refresh file tree and reload selected note', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }

      const mockNote: NoteData = {
        content: '# Updated Note',
        path: '/test.md',
        size: 20,
        modified: 1234567890
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      mockedApiClient.getNote.mockResolvedValue(mockNote)

      // Set a selected note
      vaultStore.selectedNote = {
        content: '# Old Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      const result = await vaultStore.refresh()

      expect(result).toBe(true)
      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(mockedApiClient.getNote).toHaveBeenCalledWith('/test.md')
      expect(vaultStore.fileTree).toEqual(mockTree)
      expect(vaultStore.selectedNote).toEqual(mockNote)
    })

    it('should refresh file tree without reloading note if none selected', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)

      const result = await vaultStore.refresh()

      expect(result).toBe(true)
      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(mockedApiClient.getNote).not.toHaveBeenCalled()
    })
  })
})

