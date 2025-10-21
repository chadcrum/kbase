import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import type { FileTreeNode, NoteData } from '@/types'

export const useVaultStore = defineStore('vault', () => {
  // State
  const fileTree = ref<FileTreeNode | null>(null)
  const selectedNote = ref<NoteData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const expandedPaths = ref<Set<string>>(new Set())
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)

  // Getters
  const hasError = computed(() => error.value !== null)
  const isNoteSelected = computed(() => selectedNote.value !== null)
  const selectedNotePath = computed(() => selectedNote.value?.path || null)

  // Actions
  const loadFileTree = async (): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const tree = await apiClient.getNotes()
      fileTree.value = tree
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to load file tree'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const loadNote = async (path: string): Promise<boolean> => {
    if (!path) return false

    isLoading.value = true
    error.value = null

    try {
      const note = await apiClient.getNote(path)
      selectedNote.value = note
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to load note'
      selectedNote.value = null
      return false
    } finally {
      isLoading.value = false
    }
  }

  const selectNote = (path: string) => {
    if (path === selectedNotePath.value) return
    
    // Clear current selection
    selectedNote.value = null
    
    // Load the new note
    loadNote(path)
  }

  const clearSelection = () => {
    selectedNote.value = null
    error.value = null
  }

  const toggleExpanded = (path: string) => {
    if (expandedPaths.value.has(path)) {
      expandedPaths.value.delete(path)
    } else {
      expandedPaths.value.add(path)
    }
  }

  const isExpanded = (path: string): boolean => {
    return expandedPaths.value.has(path)
  }

  const clearError = () => {
    error.value = null
  }

  const refresh = async (): Promise<boolean> => {
    const success = await loadFileTree()
    if (success && selectedNotePath.value) {
      // Reload the currently selected note
      await loadNote(selectedNotePath.value)
    }
    return success
  }

  const updateNote = async (path: string, content: string): Promise<boolean> => {
    if (!path) return false

    isSaving.value = true
    saveError.value = null

    try {
      await apiClient.updateNote(path, content)
      
      // Update the local note content if it's the currently selected note
      if (selectedNote.value && selectedNote.value.path === path) {
        selectedNote.value.content = content
      }
      
      return true
    } catch (err: any) {
      saveError.value = err.response?.data?.detail || 'Failed to save note'
      return false
    } finally {
      isSaving.value = false
    }
  }

  const clearSaveError = () => {
    saveError.value = null
  }

  // File operations
  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      await apiClient.deleteNote(path)
      
      // If the deleted file was selected, clear selection
      if (selectedNotePath.value === path) {
        clearSelection()
      }
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to delete file'
      return false
    }
  }

  const renameFile = async (oldPath: string, newName: string): Promise<boolean> => {
    try {
      await apiClient.renameNote(oldPath, newName)
      
      // Build new path
      const pathParts = oldPath.split('/')
      pathParts[pathParts.length - 1] = newName
      const newPath = pathParts.join('/')
      
      // If the renamed file was selected, update selection
      if (selectedNotePath.value === oldPath) {
        await loadNote(newPath)
      }
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to rename file'
      return false
    }
  }

  const moveFile = async (path: string, destinationDir: string): Promise<boolean> => {
    try {
      // Build destination path
      const fileName = path.split('/').pop() || ''
      const destination = destinationDir === '/' ? `/${fileName}` : `${destinationDir}/${fileName}`
      
      await apiClient.moveNote(path, destination)
      
      // If the moved file was selected, clear selection
      if (selectedNotePath.value === path) {
        clearSelection()
      }
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to move file'
      return false
    }
  }

  // Directory operations
  const deleteDirectory = async (path: string, recursive: boolean = true): Promise<boolean> => {
    try {
      await apiClient.deleteDirectory(path, recursive)
      
      // Clear selection if it was inside the deleted directory
      if (selectedNotePath.value?.startsWith(path)) {
        clearSelection()
      }
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to delete directory'
      return false
    }
  }

  const renameDirectory = async (oldPath: string, newName: string): Promise<boolean> => {
    try {
      await apiClient.renameDirectory(oldPath, newName)
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to rename directory'
      return false
    }
  }

  const moveDirectory = async (path: string, destinationDir: string): Promise<boolean> => {
    try {
      // Build destination path
      const dirName = path.split('/').filter(Boolean).pop() || ''
      const destination = destinationDir === '/' ? `/${dirName}` : `${destinationDir}/${dirName}`
      
      await apiClient.moveDirectory(path, destination)
      
      // Clear selection if it was inside the moved directory
      if (selectedNotePath.value?.startsWith(path)) {
        clearSelection()
      }
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to move directory'
      return false
    }
  }

  const createDirectory = async (path: string): Promise<boolean> => {
    try {
      await apiClient.createDirectory(path)
      
      // Refresh file tree
      await loadFileTree()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to create directory'
      return false
    }
  }

  const createNote = async (path: string, content: string = ''): Promise<boolean> => {
    try {
      await apiClient.createNote(path, content)
      
      // Refresh file tree
      await loadFileTree()
      
      // Optionally open the newly created note
      if (path) {
        await loadNote(path)
      }
      
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to create note'
      return false
    }
  }

  return {
    // State
    fileTree,
    selectedNote,
    isLoading,
    error,
    expandedPaths,
    isSaving,
    saveError,
    // Getters
    hasError,
    isNoteSelected,
    selectedNotePath,
    // Actions
    loadFileTree,
    loadNote,
    selectNote,
    clearSelection,
    toggleExpanded,
    isExpanded,
    clearError,
    refresh,
    updateNote,
    clearSaveError,
    // File operations
    deleteFile,
    renameFile,
    moveFile,
    // Directory operations
    deleteDirectory,
    renameDirectory,
    moveDirectory,
    createDirectory,
    createNote
  }
})

