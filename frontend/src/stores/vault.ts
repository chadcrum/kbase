import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import type { FileTreeNode, NoteData } from '@/types'

export type SortBy = 'name' | 'created' | 'modified'
export type SortOrder = 'asc' | 'desc'

const SORT_BY_KEY = 'kbase_sort_by'
const SORT_ORDER_KEY = 'kbase_sort_order'

export const useVaultStore = defineStore('vault', () => {
  // State
  const fileTree = ref<FileTreeNode | null>(null)
  const selectedNote = ref<NoteData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const expandedPaths = ref<Set<string>>(new Set())
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
  
  // Sort state - load from localStorage
  const sortBy = ref<SortBy>((localStorage.getItem(SORT_BY_KEY) as SortBy) || 'name')
  const sortOrder = ref<SortOrder>((localStorage.getItem(SORT_ORDER_KEY) as SortOrder) || 'asc')

  // Getters
  const hasError = computed(() => error.value !== null)
  const isNoteSelected = computed(() => selectedNote.value !== null)
  const selectedNotePath = computed(() => selectedNote.value?.path || null)
  
  // Helper function to sort nodes
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    if (!nodes || nodes.length === 0) return nodes
    
    // Separate folders and files
    const folders = nodes.filter(node => node.type === 'directory')
    const files = nodes.filter(node => node.type === 'file')
    
    // Sort function based on current sort criteria
    const compare = (a: FileTreeNode, b: FileTreeNode): number => {
      let result = 0
      
      if (sortBy.value === 'name') {
        result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      } else if (sortBy.value === 'created') {
        const aCreated = a.created || 0
        const bCreated = b.created || 0
        result = aCreated - bCreated
      } else if (sortBy.value === 'modified') {
        const aModified = a.modified || 0
        const bModified = b.modified || 0
        result = aModified - bModified
      }
      
      // Apply sort order
      return sortOrder.value === 'asc' ? result : -result
    }
    
    // Sort each group
    const sortedFolders = [...folders].sort(compare)
    const sortedFiles = [...files].sort(compare)
    
    // Recursively sort children in folders
    const foldersWithSortedChildren = sortedFolders.map(folder => ({
      ...folder,
      children: folder.children ? sortNodes(folder.children) : []
    }))
    
    // Folders first, then files
    return [...foldersWithSortedChildren, ...sortedFiles]
  }
  
  // Sorted file tree
  const sortedFileTree = computed((): FileTreeNode | null => {
    if (!fileTree.value) return null
    
    return {
      ...fileTree.value,
      children: fileTree.value.children ? sortNodes(fileTree.value.children) : []
    }
  })

  // Actions
  const loadFileTree = async (): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const tree = await apiClient.getNotes()
      fileTree.value = tree
      // Auto-expand root to show first-level items
      expandedPaths.value.add('/')
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

  // Sort actions
  const setSortBy = (newSortBy: SortBy) => {
    sortBy.value = newSortBy
    localStorage.setItem(SORT_BY_KEY, newSortBy)
  }

  const setSortOrder = (newSortOrder: SortOrder) => {
    sortOrder.value = newSortOrder
    localStorage.setItem(SORT_ORDER_KEY, newSortOrder)
  }

  const toggleSortOrder = () => {
    const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
    setSortOrder(newOrder)
  }

  // Collapse all action
  const collapseAll = () => {
    expandedPaths.value.clear()
    // Keep root expanded to show first-level items
    expandedPaths.value.add('/')
  }

  const hasExpandedPaths = computed(() => expandedPaths.value.size > 0)

  return {
    // State
    fileTree,
    selectedNote,
    isLoading,
    error,
    expandedPaths,
    isSaving,
    saveError,
    sortBy,
    sortOrder,
    // Getters
    hasError,
    isNoteSelected,
    selectedNotePath,
    sortedFileTree,
    hasExpandedPaths,
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
    createNote,
    // Sort actions
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    // Collapse all action
    collapseAll
  }
})

