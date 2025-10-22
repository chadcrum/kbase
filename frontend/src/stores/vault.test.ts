import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore } from './vault'
import { apiClient } from '@/api/client'
import type { FileTreeNode, NoteData } from '@/types'

// Mock the API client
vi.mock('@/api/client', () => ({
  apiClient: {
    getNotes: vi.fn(),
    getNote: vi.fn(),
    updateNote: vi.fn(),
    createNote: vi.fn(),
    createDirectory: vi.fn()
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
      expect(vaultStore.isSaving).toBe(false)
      expect(vaultStore.saveError).toBeNull()
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
      const notesPromise = new Promise<FileTreeNode>(resolve => {
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

  describe('updateNote', () => {
    it('should update note successfully', async () => {
      const mockNote: NoteData = {
        content: 'Original content',
        path: '/test.md',
        size: 16,
        modified: 1234567890
      }

      vaultStore.selectedNote = mockNote
      mockedApiClient.updateNote.mockResolvedValue(undefined)

      const result = await vaultStore.updateNote('/test.md', 'Updated content')

      expect(result).toBe(true)
      expect(mockedApiClient.updateNote).toHaveBeenCalledWith('/test.md', 'Updated content')
      expect(vaultStore.selectedNote.content).toBe('Updated content')
      expect(vaultStore.saveError).toBeNull()
      expect(vaultStore.isSaving).toBe(false)
    })

    it('should handle update note failure', async () => {
      const error = { response: { data: { detail: 'Failed to save' } } }
      mockedApiClient.updateNote.mockRejectedValue(error)

      const result = await vaultStore.updateNote('/test.md', 'New content')

      expect(result).toBe(false)
      expect(vaultStore.saveError).toBe('Failed to save')
      expect(vaultStore.isSaving).toBe(false)
    })

    it('should handle update note failure without response data', async () => {
      const error = new Error('Network error')
      mockedApiClient.updateNote.mockRejectedValue(error)

      const result = await vaultStore.updateNote('/test.md', 'New content')

      expect(result).toBe(false)
      expect(vaultStore.saveError).toBe('Failed to save note')
      expect(vaultStore.isSaving).toBe(false)
    })

    it('should return false for empty path', async () => {
      const result = await vaultStore.updateNote('', 'Content')

      expect(result).toBe(false)
      expect(mockedApiClient.updateNote).not.toHaveBeenCalled()
    })

    it('should set saving state during update', async () => {
      let resolveUpdate: () => void
      const updatePromise = new Promise<void>(resolve => {
        resolveUpdate = resolve
      })
      mockedApiClient.updateNote.mockReturnValue(updatePromise)

      const updateNotePromise = vaultStore.updateNote('/test.md', 'Content')
      
      expect(vaultStore.isSaving).toBe(true)
      
      resolveUpdate!()
      
      await updateNotePromise
      
      expect(vaultStore.isSaving).toBe(false)
    })
  })

  describe('clearSaveError', () => {
    it('should clear save error state', () => {
      vaultStore.saveError = 'Some error'
      
      vaultStore.clearSaveError()
      
      expect(vaultStore.saveError).toBeNull()
    })
  })

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          {
            name: 'new-folder',
            path: '/new-folder',
            type: 'directory',
            children: []
          }
        ]
      }

      mockedApiClient.createDirectory.mockResolvedValue(undefined)
      mockedApiClient.getNotes.mockResolvedValue(mockTree)

      const result = await vaultStore.createDirectory('new-folder')

      expect(mockedApiClient.createDirectory).toHaveBeenCalledWith('new-folder')
      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(vaultStore.fileTree).toEqual(mockTree)
      expect(vaultStore.error).toBeNull()
    })

    it('should handle directory creation failure', async () => {
      const error = { response: { data: { detail: 'Directory already exists' } } }
      mockedApiClient.createDirectory.mockRejectedValue(error)

      const result = await vaultStore.createDirectory('existing-folder')

      expect(result).toBe(false)
      expect(vaultStore.error).toBe('Directory already exists')
    })

    it('should handle directory creation failure without response data', async () => {
      const error = new Error('Network error')
      mockedApiClient.createDirectory.mockRejectedValue(error)

      const result = await vaultStore.createDirectory('new-folder')

      expect(result).toBe(false)
      expect(vaultStore.error).toBe('Failed to create directory')
    })
  })

  describe('createNote', () => {
    it('should create note successfully and load it', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          {
            name: 'new-note.md',
            path: '/new-note.md',
            type: 'file'
          }
        ]
      }

      const mockNote: NoteData = {
        path: '/new-note.md',
        content: '',
        size: 0,
        modified: Date.now()
      }

      mockedApiClient.createNote.mockResolvedValue(undefined)
      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      mockedApiClient.getNote.mockResolvedValue(mockNote)

      const result = await vaultStore.createNote('new-note.md', '')

      expect(mockedApiClient.createNote).toHaveBeenCalledWith('new-note.md', '')
      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(mockedApiClient.getNote).toHaveBeenCalledWith('new-note.md')
      expect(result).toBe(true)
      expect(vaultStore.fileTree).toEqual(mockTree)
      expect(vaultStore.selectedNote).toEqual(mockNote)
      expect(vaultStore.error).toBeNull()
    })

    it('should create note with custom content', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }

      const mockNote: NoteData = {
        path: '/note.md',
        content: '# New Note',
        size: 10,
        modified: Date.now()
      }

      mockedApiClient.createNote.mockResolvedValue(undefined)
      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      mockedApiClient.getNote.mockResolvedValue(mockNote)

      const result = await vaultStore.createNote('note.md', '# New Note')

      expect(mockedApiClient.createNote).toHaveBeenCalledWith('note.md', '# New Note')
      expect(result).toBe(true)
    })

    it('should handle note creation failure', async () => {
      const error = { response: { data: { detail: 'File already exists' } } }
      mockedApiClient.createNote.mockRejectedValue(error)

      const result = await vaultStore.createNote('existing.md', '')

      expect(result).toBe(false)
      expect(vaultStore.error).toBe('File already exists')
    })

    it('should handle note creation failure without response data', async () => {
      const error = new Error('Network error')
      mockedApiClient.createNote.mockRejectedValue(error)

      const result = await vaultStore.createNote('note.md', '')

      expect(result).toBe(false)
      expect(vaultStore.error).toBe('Failed to create note')
    })
  })

  describe('sorting', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
      // Create a fresh store instance
      setActivePinia(createPinia())
      vaultStore = useVaultStore()
    })

    it('should have default sort settings', () => {
      expect(vaultStore.sortBy).toBe('name')
      expect(vaultStore.sortOrder).toBe('asc')
    })

    it('should load sort settings from localStorage', () => {
      localStorage.setItem('kbase_sort_by', 'modified')
      localStorage.setItem('kbase_sort_order', 'desc')
      
      // Create new store instance to test initialization
      setActivePinia(createPinia())
      const newStore = useVaultStore()
      
      expect(newStore.sortBy).toBe('modified')
      expect(newStore.sortOrder).toBe('desc')
    })

    it('should update sortBy and save to localStorage', () => {
      vaultStore.setSortBy('created')
      
      expect(vaultStore.sortBy).toBe('created')
      expect(localStorage.getItem('kbase_sort_by')).toBe('created')
    })

    it('should update sortOrder and save to localStorage', () => {
      vaultStore.setSortOrder('desc')
      
      expect(vaultStore.sortOrder).toBe('desc')
      expect(localStorage.getItem('kbase_sort_order')).toBe('desc')
    })

    it('should toggle sortOrder', () => {
      expect(vaultStore.sortOrder).toBe('asc')
      
      vaultStore.toggleSortOrder()
      expect(vaultStore.sortOrder).toBe('desc')
      
      vaultStore.toggleSortOrder()
      expect(vaultStore.sortOrder).toBe('asc')
    })

    it('should sort files by name ascending', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra.md', path: '/zebra.md', type: 'file', created: 1000, modified: 2000 },
          { name: 'alpha.md', path: '/alpha.md', type: 'file', created: 3000, modified: 4000 },
          { name: 'beta.md', path: '/beta.md', type: 'file', created: 2000, modified: 3000 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('name')
      vaultStore.setSortOrder('asc')

      const sorted = vaultStore.sortedFileTree
      expect(sorted?.children?.map(c => c.name)).toEqual(['alpha.md', 'beta.md', 'zebra.md'])
    })

    it('should sort files by name descending', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra.md', path: '/zebra.md', type: 'file', created: 1000, modified: 2000 },
          { name: 'alpha.md', path: '/alpha.md', type: 'file', created: 3000, modified: 4000 },
          { name: 'beta.md', path: '/beta.md', type: 'file', created: 2000, modified: 3000 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('name')
      vaultStore.setSortOrder('desc')

      const sorted = vaultStore.sortedFileTree
      expect(sorted?.children?.map(c => c.name)).toEqual(['zebra.md', 'beta.md', 'alpha.md'])
    })

    it('should sort files by created date ascending', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra.md', path: '/zebra.md', type: 'file', created: 3000, modified: 2000 },
          { name: 'alpha.md', path: '/alpha.md', type: 'file', created: 1000, modified: 4000 },
          { name: 'beta.md', path: '/beta.md', type: 'file', created: 2000, modified: 3000 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('created')
      vaultStore.setSortOrder('asc')

      const sorted = vaultStore.sortedFileTree
      expect(sorted?.children?.map(c => c.name)).toEqual(['alpha.md', 'beta.md', 'zebra.md'])
    })

    it('should sort files by modified date descending', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra.md', path: '/zebra.md', type: 'file', created: 1000, modified: 2000 },
          { name: 'alpha.md', path: '/alpha.md', type: 'file', created: 3000, modified: 4000 },
          { name: 'beta.md', path: '/beta.md', type: 'file', created: 2000, modified: 3000 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('modified')
      vaultStore.setSortOrder('desc')

      const sorted = vaultStore.sortedFileTree
      expect(sorted?.children?.map(c => c.name)).toEqual(['alpha.md', 'beta.md', 'zebra.md'])
    })

    it('should place folders before files in sorted results', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra.md', path: '/zebra.md', type: 'file', created: 1000, modified: 2000 },
          { name: 'folder-b', path: '/folder-b', type: 'directory', created: 3000, modified: 4000, children: [] },
          { name: 'alpha.md', path: '/alpha.md', type: 'file', created: 2000, modified: 3000 },
          { name: 'folder-a', path: '/folder-a', type: 'directory', created: 2000, modified: 3000, children: [] }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('name')
      vaultStore.setSortOrder('asc')

      const sorted = vaultStore.sortedFileTree
      const names = sorted?.children?.map(c => c.name)
      
      // Folders should be first
      expect(names).toEqual(['folder-a', 'folder-b', 'alpha.md', 'zebra.md'])
    })

    it('should recursively sort nested folders', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          {
            name: 'folder-a',
            path: '/folder-a',
            type: 'directory',
            created: 1000,
            modified: 2000,
            children: [
              { name: 'z-nested.md', path: '/folder-a/z-nested.md', type: 'file', created: 1000, modified: 2000 },
              { name: 'a-nested.md', path: '/folder-a/a-nested.md', type: 'file', created: 2000, modified: 3000 }
            ]
          }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('name')
      vaultStore.setSortOrder('asc')

      const sorted = vaultStore.sortedFileTree
      const folderChildren = sorted?.children?.[0]?.children?.map(c => c.name)
      
      expect(folderChildren).toEqual(['a-nested.md', 'z-nested.md'])
    })
  })
})

