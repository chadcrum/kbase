import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVaultStore, LAST_SELECTED_NOTE_KEY } from './vault'
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

const createLocalStorageMock = (): Storage => {
  let store: Record<string, string> = {}

  return {
    get length() {
      return Object.keys(store).length
    },
    clear() {
      store = {}
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    key(index: number) {
      const keys = Object.keys(store)
      return keys[index] ?? null
    },
    removeItem(key: string) {
      delete store[key]
    },
    setItem(key: string, value: string) {
      store[key] = value
    }
  }
}

const localStorageMock = createLocalStorageMock()

// Mock window object for viewport detection
const createWindowMock = (width: number) => ({
  innerWidth: width,
  innerHeight: 800
})

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock)
})

describe('VaultStore', () => {
  let vaultStore: ReturnType<typeof useVaultStore>
  let originalWindow: Window | undefined

  beforeEach(() => {
    // Store original window if it exists
    originalWindow = typeof window !== 'undefined' ? window : undefined
    
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    vaultStore = useVaultStore()
    
    // Reset all mocks
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original window if it existed
    if (originalWindow) {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true
      })
    }
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
      // Root should be auto-expanded to show first-level items
      expect(vaultStore.isExpanded('/')).toBe(true)
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

    it('should restore last selected note from localStorage when available', async () => {
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

      const mockNote: NoteData = {
        content: '# Restored Note',
        path: '/note1.md',
        size: 18,
        modified: 1234567890
      }

      localStorage.setItem(LAST_SELECTED_NOTE_KEY, '/note1.md')
      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      mockedApiClient.getNote.mockResolvedValue(mockNote)

      const result = await vaultStore.loadFileTree()

      expect(result).toBe(true)
      expect(mockedApiClient.getNotes).toHaveBeenCalled()
      expect(mockedApiClient.getNote).toHaveBeenCalledWith('/note1.md')
      expect(vaultStore.selectedNote).toEqual(mockNote)
      expect(vaultStore.isExpanded('/')).toBe(true)
      expect(localStorage.getItem(LAST_SELECTED_NOTE_KEY)).toBe('/note1.md')
    })

    it('should expand ancestor directories when restoring a nested note from storage', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          {
            name: 'folder',
            path: '/folder',
            type: 'directory',
            children: [
              {
                name: 'sub',
                path: '/folder/sub',
                type: 'directory',
                children: [
                  {
                    name: 'note.md',
                    path: '/folder/sub/note.md',
                    type: 'file'
                  }
                ]
              }
            ]
          }
        ]
      }

      const mockNote: NoteData = {
        content: '# Nested Note',
        path: '/folder/sub/note.md',
        size: 42,
        modified: 1234567890
      }

      localStorage.setItem(LAST_SELECTED_NOTE_KEY, '/folder/sub/note.md')
      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      mockedApiClient.getNote.mockResolvedValue(mockNote)

      await vaultStore.loadFileTree()

      expect(vaultStore.isExpanded('/')).toBe(true)
      expect(vaultStore.isExpanded('/folder')).toBe(true)
      expect(vaultStore.isExpanded('/folder/sub')).toBe(true)
      expect(vaultStore.selectedNote?.path).toBe('/folder/sub/note.md')
    })

    it('should remove stored note path if it no longer exists in the tree', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }

      localStorage.setItem(LAST_SELECTED_NOTE_KEY, '/missing.md')
      mockedApiClient.getNotes.mockResolvedValue(mockTree)

      const result = await vaultStore.loadFileTree()

      expect(result).toBe(true)
      expect(mockedApiClient.getNote).not.toHaveBeenCalled()
      expect(localStorage.getItem(LAST_SELECTED_NOTE_KEY)).toBeNull()
      expect(vaultStore.selectedNote).toBeNull()
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

    it('should persist last selected note path on successful load', async () => {
      const mockNote: NoteData = {
        content: '# Test Note\nThis is a test.',
        path: '/test.md',
        size: 25,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      await vaultStore.loadNote('/test.md')

      expect(localStorage.getItem(LAST_SELECTED_NOTE_KEY)).toBe('/test.md')
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

    it('should expand ancestor directories when selecting a nested note', async () => {
      const mockNote: NoteData = {
        content: '# Nested Note',
        path: '/folder/sub/note.md',
        size: 20,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      vaultStore.selectNote('/folder/sub/note.md')

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vaultStore.expandedPaths.has('/')).toBe(true)
      expect(vaultStore.expandedPaths.has('/folder')).toBe(true)
      expect(vaultStore.expandedPaths.has('/folder/sub')).toBe(true)
    })

    it('should keep root expanded when selecting a root-level note', async () => {
      const mockNote: NoteData = {
        content: '# Root Note',
        path: '/note.md',
        size: 10,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      vaultStore.selectNote('/note.md')

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vaultStore.expandedPaths.has('/')).toBe(true)
      expect(vaultStore.expandedPaths.size).toBe(1)
    })

    it('should collapse sidebar when selecting a note and sidebar is not pinned', async () => {
      const mockNote: NoteData = {
        content: '# Test Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      // Ensure sidebar is not pinned and not collapsed
      vaultStore.isSidebarPinned = false
      vaultStore.isSidebarCollapsed = false

      vaultStore.selectNote('/test.md')

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vaultStore.isSidebarCollapsed).toBe(true)
    })

    it('should not collapse sidebar when selecting a note and sidebar is pinned', async () => {
      const mockNote: NoteData = {
        content: '# Test Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      // Ensure sidebar is pinned and not collapsed
      vaultStore.isSidebarPinned = true
      vaultStore.isSidebarCollapsed = false

      vaultStore.selectNote('/test.md')

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vaultStore.isSidebarCollapsed).toBe(false)
    })

    it('should not collapse sidebar when selecting a note with shouldBroadcast=false', async () => {
      const mockNote: NoteData = {
        content: '# Test Note',
        path: '/test.md',
        size: 15,
        modified: 1234567890
      }

      mockedApiClient.getNote.mockResolvedValue(mockNote)

      // Ensure sidebar is not pinned and not collapsed
      vaultStore.isSidebarPinned = false
      vaultStore.isSidebarCollapsed = false

      vaultStore.selectNote('/test.md', false)

      await new Promise(resolve => setTimeout(resolve, 0))

      // Should not collapse when shouldBroadcast is false (e.g., window sync)
      expect(vaultStore.isSidebarCollapsed).toBe(false)
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
      localStorage.setItem(LAST_SELECTED_NOTE_KEY, '/test.md')

      vaultStore.clearSelection()

      expect(vaultStore.selectedNote).toBeNull()
      expect(vaultStore.error).toBeNull()
      expect(localStorage.getItem(LAST_SELECTED_NOTE_KEY)).toBeNull()
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
      expect(vaultStore.sortDirectoriesWithFiles).toBe(false)
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

    it('should fall back to defaults when stored sort settings are invalid', () => {
      localStorage.setItem('kbase_sort_by', 'invalid')
      localStorage.setItem('kbase_sort_order', 'forwards')

      setActivePinia(createPinia())
      const newStore = useVaultStore()

      expect(newStore.sortBy).toBe('name')
      expect(newStore.sortOrder).toBe('asc')
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

    it('should have default sortDirectoriesWithFiles as false', () => {
      expect(vaultStore.sortDirectoriesWithFiles).toBe(false)
    })

    it('should load sortDirectoriesWithFiles from localStorage', () => {
      localStorage.setItem('kbase_sort_directories_with_files', 'true')
      
      setActivePinia(createPinia())
      const newStore = useVaultStore()
      
      expect(newStore.sortDirectoriesWithFiles).toBe(true)
    })

    it('should toggle sortDirectoriesWithFiles and save to localStorage', () => {
      expect(vaultStore.sortDirectoriesWithFiles).toBe(false)
      
      vaultStore.toggleSortDirectoriesWithFiles()
      expect(vaultStore.sortDirectoriesWithFiles).toBe(true)
      expect(localStorage.getItem('kbase_sort_directories_with_files')).toBe('true')
      
      vaultStore.toggleSortDirectoriesWithFiles()
      expect(vaultStore.sortDirectoriesWithFiles).toBe(false)
      expect(localStorage.getItem('kbase_sort_directories_with_files')).toBe('false')
    })

    it('should sort directories alphabetically when sortDirectoriesWithFiles is false', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra-dir', path: '/zebra-dir', type: 'directory', created: 1000, modified: 2000, children: [] },
          { name: 'alpha-dir', path: '/alpha-dir', type: 'directory', created: 3000, modified: 4000, children: [] },
          { name: 'beta-dir', path: '/beta-dir', type: 'directory', created: 2000, modified: 3000, children: [] },
          { name: 'file.md', path: '/file.md', type: 'file', created: 1500, modified: 2500 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('created')
      vaultStore.setSortOrder('asc')
      vaultStore.toggleSortDirectoriesWithFiles() // Ensure it's false (default)
      if (vaultStore.sortDirectoriesWithFiles) {
        vaultStore.toggleSortDirectoriesWithFiles()
      }

      const sorted = vaultStore.sortedFileTree
      // Directories should be alphabetically sorted (not by created/modified), but respect sort order
      // Files should be sorted by created date ascending
      expect(sorted?.children?.map(c => c.name)).toEqual(['alpha-dir', 'beta-dir', 'zebra-dir', 'file.md'])
    })

    it('should sort directories alphabetically in descending order when sortDirectoriesWithFiles is false', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra-dir', path: '/zebra-dir', type: 'directory', created: 1000, modified: 2000, children: [] },
          { name: 'alpha-dir', path: '/alpha-dir', type: 'directory', created: 3000, modified: 4000, children: [] },
          { name: 'beta-dir', path: '/beta-dir', type: 'directory', created: 2000, modified: 3000, children: [] },
          { name: 'file.md', path: '/file.md', type: 'file', created: 1500, modified: 2500 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('created')
      vaultStore.setSortOrder('desc')
      vaultStore.toggleSortDirectoriesWithFiles() // Ensure it's false (default)
      if (vaultStore.sortDirectoriesWithFiles) {
        vaultStore.toggleSortDirectoriesWithFiles()
      }

      const sorted = vaultStore.sortedFileTree
      // Directories should be alphabetically sorted in descending order (zebra, beta, alpha)
      // Files should be sorted by created date descending
      expect(sorted?.children?.map(c => c.name)).toEqual(['zebra-dir', 'beta-dir', 'alpha-dir', 'file.md'])
    })

    it('should sort directories with files when sortDirectoriesWithFiles is true', async () => {
      const mockTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: [
          { name: 'zebra-dir', path: '/zebra-dir', type: 'directory', created: 1000, modified: 2000, children: [] },
          { name: 'alpha-dir', path: '/alpha-dir', type: 'directory', created: 3000, modified: 4000, children: [] },
          { name: 'beta-dir', path: '/beta-dir', type: 'directory', created: 2000, modified: 3000, children: [] },
          { name: 'file.md', path: '/file.md', type: 'file', created: 1500, modified: 2500 }
        ]
      }

      mockedApiClient.getNotes.mockResolvedValue(mockTree)
      await vaultStore.loadFileTree()

      vaultStore.setSortBy('created')
      vaultStore.setSortOrder('asc')
      vaultStore.toggleSortDirectoriesWithFiles() // Set to true

      const sorted = vaultStore.sortedFileTree
      // Directories should be sorted by created date ascending, but still appear before files
      expect(sorted?.children?.map(c => c.name)).toEqual(['zebra-dir', 'beta-dir', 'alpha-dir', 'file.md'])
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

  describe('collapse all', () => {
    it('should have hasExpandedPaths as false initially', () => {
      expect(vaultStore.hasExpandedPaths).toBe(false)
    })

    it('should collapse all expanded paths but keep root expanded', () => {
      vaultStore.expandedPaths.add('/folder1')
      vaultStore.expandedPaths.add('/folder2')
      vaultStore.expandedPaths.add('/folder1/subfolder')
      
      expect(vaultStore.expandedPaths.size).toBe(3)
      expect(vaultStore.hasExpandedPaths).toBe(true)
      
      vaultStore.collapseAll()
      
      // Root should remain expanded to show first-level items
      expect(vaultStore.expandedPaths.size).toBe(1)
      expect(vaultStore.isExpanded('/')).toBe(true)
      expect(vaultStore.hasExpandedPaths).toBe(true)
    })

    it('should keep root expanded when collapseAll is called with no other paths', () => {
      expect(vaultStore.expandedPaths.size).toBe(0)
      expect(vaultStore.hasExpandedPaths).toBe(false)
      
      vaultStore.collapseAll()
      
      // Root should be expanded to show first-level items
      expect(vaultStore.expandedPaths.size).toBe(1)
      expect(vaultStore.isExpanded('/')).toBe(true)
      expect(vaultStore.hasExpandedPaths).toBe(true)
    })

    it('should update hasExpandedPaths reactively', () => {
      expect(vaultStore.hasExpandedPaths).toBe(false)
      
      vaultStore.expandedPaths.add('/folder1')
      expect(vaultStore.hasExpandedPaths).toBe(true)
      
      vaultStore.collapseAll()
      // After collapseAll, root is still expanded
      expect(vaultStore.hasExpandedPaths).toBe(true)
      expect(vaultStore.isExpanded('/')).toBe(true)
    })
  })

  describe('sidebar toggle', () => {
    it('should have sidebar expanded by default', () => {
      expect(vaultStore.isSidebarCollapsed).toBe(false)
    })

    it('should collapse sidebar when toggleSidebar is called', () => {
      expect(vaultStore.isSidebarCollapsed).toBe(false)
      
      vaultStore.toggleSidebar()
      
      expect(vaultStore.isSidebarCollapsed).toBe(true)
    })

    it('should expand sidebar when toggleSidebar is called again', () => {
      vaultStore.toggleSidebar() // Collapse
      expect(vaultStore.isSidebarCollapsed).toBe(true)
      
      vaultStore.toggleSidebar() // Expand
      
      expect(vaultStore.isSidebarCollapsed).toBe(false)
    })

    it('should toggle sidebar state multiple times', () => {
      expect(vaultStore.isSidebarCollapsed).toBe(false)
      
      vaultStore.toggleSidebar()
      expect(vaultStore.isSidebarCollapsed).toBe(true)
      
      vaultStore.toggleSidebar()
      expect(vaultStore.isSidebarCollapsed).toBe(false)
      
      vaultStore.toggleSidebar()
      expect(vaultStore.isSidebarCollapsed).toBe(true)
    })

    it('should maintain sidebar state across operations', () => {
      vaultStore.toggleSidebar() // Collapse
      expect(vaultStore.isSidebarCollapsed).toBe(true)
      
      // Perform other operations
      vaultStore.expandedPaths.add('/folder1')
      vaultStore.collapseAll()
      
      // Sidebar state should remain collapsed
      expect(vaultStore.isSidebarCollapsed).toBe(true)
    })
  })

  describe('sidebar pin', () => {
    it('should have sidebar pinned by default on desktop (>= 768px)', () => {
      // Mock desktop viewport
      Object.defineProperty(global, 'window', {
        value: createWindowMock(1024),
        writable: true,
        configurable: true
      })
      
      // Create a new store instance with desktop viewport
      setActivePinia(createPinia())
      const desktopStore = useVaultStore()
      
      expect(desktopStore.isSidebarPinned).toBe(true)
    })

    it('should have sidebar unpinned by default on mobile (< 768px)', () => {
      // Mock mobile viewport
      Object.defineProperty(global, 'window', {
        value: createWindowMock(375),
        writable: true,
        configurable: true
      })
      
      // Create a new store instance with mobile viewport
      setActivePinia(createPinia())
      const mobileStore = useVaultStore()
      
      expect(mobileStore.isSidebarPinned).toBe(false)
    })

    it('should pin sidebar when toggleSidebarPin is called', () => {
      // Start with unpinned state (mobile default)
      Object.defineProperty(global, 'window', {
        value: createWindowMock(375),
        writable: true,
        configurable: true
      })
      
      setActivePinia(createPinia())
      const testStore = useVaultStore()
      expect(testStore.isSidebarPinned).toBe(false)
      
      testStore.toggleSidebarPin()
      
      expect(testStore.isSidebarPinned).toBe(true)
    })

    it('should unpin sidebar when toggleSidebarPin is called again', () => {
      // Set up mobile viewport for consistent starting state
      Object.defineProperty(global, 'window', {
        value: createWindowMock(375),
        writable: true,
        configurable: true
      })
      
      setActivePinia(createPinia())
      const testStore = useVaultStore()
      expect(testStore.isSidebarPinned).toBe(false)
      
      testStore.toggleSidebarPin() // Pin
      expect(testStore.isSidebarPinned).toBe(true)
      
      testStore.toggleSidebarPin() // Unpin
      expect(testStore.isSidebarPinned).toBe(false)
    })

    it('should collapse sidebar when collapseSidebarIfNotPinned is called and not pinned', () => {
      // Set up mobile viewport (unpinned by default)
      Object.defineProperty(global, 'window', {
        value: createWindowMock(375),
        writable: true,
        configurable: true
      })
      
      setActivePinia(createPinia())
      const testStore = useVaultStore()
      expect(testStore.isSidebarPinned).toBe(false)
      expect(testStore.isSidebarCollapsed).toBe(false)
      
      testStore.collapseSidebarIfNotPinned()
      
      expect(testStore.isSidebarCollapsed).toBe(true)
    })

    it('should not collapse sidebar when collapseSidebarIfNotPinned is called and pinned', () => {
      // Set up desktop viewport (pinned by default)
      Object.defineProperty(global, 'window', {
        value: createWindowMock(1024),
        writable: true,
        configurable: true
      })
      
      setActivePinia(createPinia())
      const testStore = useVaultStore()
      expect(testStore.isSidebarPinned).toBe(true)
      expect(testStore.isSidebarCollapsed).toBe(false)
      
      testStore.collapseSidebarIfNotPinned()
      
      expect(testStore.isSidebarCollapsed).toBe(false)
    })

    it('should allow manual toggle regardless of pin state', () => {
      // Set up desktop viewport (pinned by default)
      Object.defineProperty(global, 'window', {
        value: createWindowMock(1024),
        writable: true,
        configurable: true
      })
      
      setActivePinia(createPinia())
      const testStore = useVaultStore()
      expect(testStore.isSidebarPinned).toBe(true)
      expect(testStore.isSidebarCollapsed).toBe(false)
      
      // Manual toggle should still work when pinned
      testStore.toggleSidebar()
      expect(testStore.isSidebarCollapsed).toBe(true)
      
      testStore.toggleSidebar()
      expect(testStore.isSidebarCollapsed).toBe(false)
    })
  })
})

