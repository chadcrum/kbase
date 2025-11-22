import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { apiClient } from '@/api/client'
import type { FileTreeNode, NoteData } from '@/types'
import { useTabsStore } from './tabs'
import { windowSyncService } from '@/composables/useWindowSync'

export type SortBy = 'name' | 'created' | 'modified'
export type SortOrder = 'asc' | 'desc'

const SORT_BY_KEY = 'kbase_sort_by'
const SORT_ORDER_KEY = 'kbase_sort_order'
const SORT_DIRECTORIES_WITH_FILES_KEY = 'kbase_sort_directories_with_files'
const SIDEBAR_WIDTH_KEY = 'kbase_sidebar_width'
export const LAST_SELECTED_NOTE_KEY = 'kbase_last_note_path'

const SORT_BY_VALUES: SortBy[] = ['name', 'created', 'modified']
const SORT_ORDER_VALUES: SortOrder[] = ['asc', 'desc']

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const readSortByPreference = (): SortBy => {
  const stored = getLocalStorage()?.getItem(SORT_BY_KEY)
  return SORT_BY_VALUES.includes(stored as SortBy) ? (stored as SortBy) : 'name'
}

const readSortOrderPreference = (): SortOrder => {
  const stored = getLocalStorage()?.getItem(SORT_ORDER_KEY)
  return SORT_ORDER_VALUES.includes(stored as SortOrder) ? (stored as SortOrder) : 'asc'
}

const readSortDirectoriesWithFilesPreference = (): boolean => {
  const stored = getLocalStorage()?.getItem(SORT_DIRECTORIES_WITH_FILES_KEY)
  return stored === 'true'
}

const readSidebarWidthPreference = (): number => {
  const stored = getLocalStorage()?.getItem(SIDEBAR_WIDTH_KEY)
  const parsed = stored ? parseInt(stored, 10) : null
  // Default to 300px, with min 200px and max 600px
  return parsed && parsed >= 200 && parsed <= 600 ? parsed : 300
}

const setLocalStorageItem = (key: string, value: string) => {
  try {
    getLocalStorage()?.setItem(key, value)
  } catch {
    // Ignore storage errors (e.g., private mode, quota exceeded)
  }
}

const removeLocalStorageItem = (key: string) => {
  try {
    getLocalStorage()?.removeItem(key)
  } catch {
    // Ignore storage errors
  }
}

const getLocalStorageItem = (key: string): string | null => {
  try {
    return getLocalStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

/**
 * Determines if the current viewport is desktop-sized (>= 768px).
 * Desktop mode defaults to pinned sidebar, mobile defaults to unpinned.
 */
const isDesktopViewport = (): boolean => {
  if (typeof window === 'undefined') {
    // Default to desktop for SSR
    return true
  }
  return window.innerWidth >= 768
}

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
  const sortBy = ref<SortBy>(readSortByPreference())
  const sortOrder = ref<SortOrder>(readSortOrderPreference())
  const sortDirectoriesWithFiles = ref<boolean>(readSortDirectoriesWithFilesPreference())

  // Sidebar state
  // Desktop: pinned by default, Mobile: unpinned by default
  const isSidebarCollapsed = ref(false)
  const isSidebarPinned = ref(isDesktopViewport())
  const sidebarWidth = ref<number>(readSidebarWidthPreference())

  // Getters
  const hasError = computed(() => error.value !== null)
  const isNoteSelected = computed(() => selectedNote.value !== null)
  const selectedNotePath = computed(() => selectedNote.value?.path || null)
  
  // Helper function to get all file paths from file tree
  const getAllFilePaths = (tree: FileTreeNode | null): string[] => {
    if (!tree) return []

    const paths: string[] = []

    const collectPaths = (node: FileTreeNode) => {
      if (node.type === 'file') {
        paths.push(node.path)
      } else if (node.children) {
        node.children.forEach(collectPaths)
      }
    }

    collectPaths(tree)
    return paths
  }

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
        // If timestamps are equal, fall back to name sorting for stability
        if (result === 0) {
          result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        }
      } else if (sortBy.value === 'modified') {
        const aModified = a.modified || 0
        const bModified = b.modified || 0
        result = aModified - bModified
        // If timestamps are equal, fall back to name sorting for stability
        if (result === 0) {
          result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        }
      }
      
      // Apply sort order
      return sortOrder.value === 'asc' ? result : -result
    }
    
    // Sort folders: if sortDirectoriesWithFiles is true, use compare function; otherwise, always sort alphabetically by name (but respect sort order)
    const sortedFolders = sortDirectoriesWithFiles.value
      ? [...folders].sort(compare)
      : [...folders].sort((a, b) => {
          const result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          return sortOrder.value === 'asc' ? result : -result
        })
    
    // Sort files using the compare function
    const sortedFiles = [...files].sort(compare)
    
    // Recursively sort children in folders
    const foldersWithSortedChildren = sortedFolders.map(folder => ({
      ...folder,
      children: folder.children ? sortNodes(folder.children) : []
    }))
    
    // Folders first, then files
    return [...foldersWithSortedChildren, ...sortedFiles]
  }
  
  // Helper function to update a node's modified timestamp in the file tree
  const updateNodeModifiedTime = (tree: FileTreeNode | null, targetPath: string, newModified: number): void => {
    if (!tree || !tree.children) return
    
    for (const child of tree.children) {
      if (child.path === targetPath) {
        // Found the node, update its modified timestamp
        child.modified = newModified
        return
      }
      // Recursively search in child directories
      if (child.type === 'directory' && child.children) {
        updateNodeModifiedTime(child, targetPath, newModified)
      }
    }
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
  const noteExistsInTree = (tree: FileTreeNode | null, targetPath: string): boolean => {
    if (!tree) return false
    if (tree.path === targetPath) return true
    if (!tree.children) return false

    return tree.children.some(child => noteExistsInTree(child, targetPath))
  }

  const restoreLastSelectedNote = async (): Promise<boolean> => {
    const storedPath = getLocalStorageItem(LAST_SELECTED_NOTE_KEY)

    if (!storedPath) {
      return false
    }

    if (!noteExistsInTree(fileTree.value, storedPath)) {
      removeLocalStorageItem(LAST_SELECTED_NOTE_KEY)
      return false
    }

    expandToPath(storedPath)

    const restored = await loadNote(storedPath)

    if (!restored) {
      removeLocalStorageItem(LAST_SELECTED_NOTE_KEY)
    }

    return restored
  }

  const loadFileTree = async (): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const tree = await apiClient.getNotes()
      fileTree.value = tree
      // Auto-expand root to show first-level items
      expandedPaths.value.add('/')

      // Clean up invalid tabs (tabs referencing files that no longer exist)
      const existingFiles = getAllFilePaths(tree)
      const tabsStore = useTabsStore()
      await tabsStore.cleanupInvalidTabs(existingFiles)

      if (!selectedNote.value) {
        await restoreLastSelectedNote()
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to load file tree'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const loadNote = async (path: string, bypassCache: boolean = false): Promise<boolean> => {
    if (!path) return false

    // Expand directories to the note's path before loading
    expandToPath(path)

    isLoading.value = true
    error.value = null

    try {
      // Clear selected note first to force fresh load and trigger editor update
      if (bypassCache && selectedNote.value?.path === path) {
        console.log('Clearing selectedNote to force fresh reload for:', path)
        const oldContent = selectedNote.value.content
        const oldNote = { ...selectedNote.value } // Keep a copy for comparison
        
        // Force clear by setting to null
        selectedNote.value = null
        // Small delay to ensure UI updates and editor clears
        await new Promise(resolve => setTimeout(resolve, 150))
        
        // Fetch fresh note with cache bypass
        const note = await apiClient.getNote(path, bypassCache)
        console.log('Fetched note after clear:', {
          path: note.path,
          contentLength: note.content.length,
          oldContentLength: oldContent?.length,
          contentChanged: note.content !== oldContent,
          contentPreview: note.content.substring(0, 100),
          oldContentPreview: oldContent?.substring(0, 100)
        })
        
        // Create a new object to ensure Vue detects the change
        const newNote = {
          path: note.path,
          content: note.content,
          size: note.size,
          modified: note.modified
        }
        
        // Set new note - this should trigger editor update
        selectedNote.value = newNote
        
        // Double-check the content was actually updated
        if (selectedNote.value.content !== note.content) {
          console.error('WARNING: selectedNote content mismatch after setting!')
          selectedNote.value.content = note.content
        }
      } else {
        // Normal load without cache bypass
        const note = await apiClient.getNote(path, bypassCache)
        selectedNote.value = note
      }
      
      setLocalStorageItem(LAST_SELECTED_NOTE_KEY, path)
      
      // Sync with tabs store - ensure tab exists and is active
      const tabsStore = useTabsStore()
      const tab = tabsStore.getTabByPath(path)
      if (tab) {
        tabsStore.setActiveTab(tab.id)
      } else {
        // Tab doesn't exist, create it
        tabsStore.openTab(path)
      }
      
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to load note'
      selectedNote.value = null
      return false
    } finally {
      isLoading.value = false
    }
  }

  const expandToPath = (path: string) => {
    if (!path) return

    // Always keep root expanded
    expandedPaths.value.add('/')

    const segments = path.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return
    }

    let currentPath = ''
    for (let i = 0; i < segments.length - 1; i++) {
      currentPath += `/${segments[i]}`
      expandedPaths.value.add(currentPath)
    }
  }

  const selectNote = (path: string, shouldBroadcast: boolean = true) => {
    expandToPath(path)

    if (path === selectedNotePath.value) return

    // Import tabs store
    const tabsStore = useTabsStore()
    
    // Open tab in tabs store
    tabsStore.openTab(path)
    
    // Clear current selection
    selectedNote.value = null
    
    // Load the new note
    loadNote(path)
    
    // Collapse sidebar if not pinned (only for user-initiated selections)
    if (shouldBroadcast) {
      collapseSidebarIfNotPinned()
      windowSyncService.broadcastNoteSelection(path)
    }
  }

  const clearSelection = () => {
    selectedNote.value = null
    error.value = null
    removeLocalStorageItem(LAST_SELECTED_NOTE_KEY)
    
    // Clear active tab in tabs store
    const tabsStore = useTabsStore()
    tabsStore.setActiveTab(null)
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
    // Broadcast file tree update to other windows
    if (success) {
      windowSyncService.broadcastFileTreeUpdate()
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
        const currentTime = Math.floor(Date.now() / 1000)
        selectedNote.value.content = content
        selectedNote.value.modified = currentTime
      }
      
      // Update the modified timestamp in the file tree to trigger re-sorting
      if (fileTree.value) {
        const currentTime = Math.floor(Date.now() / 1000)
        updateNodeModifiedTime(fileTree.value, path, currentTime)
        // Force reactivity by creating a new object reference
        fileTree.value = { ...fileTree.value }
      }
      
      // Broadcast note update to other windows
      windowSyncService.broadcastNoteUpdate(path, content)
      
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
      
      // Close tab if it exists
      const tabsStore = useTabsStore()
      const tab = tabsStore.getTabByPath(path)
      if (tab) {
        tabsStore.closeTab(tab.id)
      }
      
      // If the deleted file was selected, clear selection
      if (selectedNotePath.value === path) {
        clearSelection()
      }
      
      // Refresh file tree
      await loadFileTree()
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      
      // Update tab if it exists
      const tabsStore = useTabsStore()
      const tab = tabsStore.getTabByPath(oldPath)
      if (tab) {
        tab.path = newPath
        // Extract title from new path
        const pathParts = newPath.split('/')
        const filename = pathParts[pathParts.length - 1]
        tab.title = filename.endsWith('.md') ? filename.slice(0, -3) : filename
      }
      
      // If the renamed file was selected, update selection
      if (selectedNotePath.value === oldPath) {
        await loadNote(newPath)
      }
      
      // Refresh file tree
      await loadFileTree()
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      
      // Update tab if it exists
      const tabsStore = useTabsStore()
      const tab = tabsStore.getTabByPath(path)
      if (tab) {
        tab.path = destination
        // Extract title from new path
        const pathParts = destination.split('/')
        const filename = pathParts[pathParts.length - 1]
        tab.title = filename.endsWith('.md') ? filename.slice(0, -3) : filename
      }
      
      // If the moved file was selected, update selection
      if (selectedNotePath.value === path) {
        await loadNote(destination)
      }
      
      // Refresh file tree
      await loadFileTree()
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
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
      // Broadcast file tree update to other windows
      windowSyncService.broadcastFileTreeUpdate()
      
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
    setLocalStorageItem(SORT_BY_KEY, newSortBy)
  }

  const setSortOrder = (newSortOrder: SortOrder) => {
    sortOrder.value = newSortOrder
    setLocalStorageItem(SORT_ORDER_KEY, newSortOrder)
  }

  const toggleSortOrder = () => {
    const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
    setSortOrder(newOrder)
  }

  const toggleSortDirectoriesWithFiles = () => {
    sortDirectoriesWithFiles.value = !sortDirectoriesWithFiles.value
    setLocalStorageItem(SORT_DIRECTORIES_WITH_FILES_KEY, sortDirectoriesWithFiles.value.toString())
  }

  // Sidebar width actions
  const setSidebarWidth = (newWidth: number) => {
    // Constrain width between 200px and 600px
    const constrainedWidth = Math.max(200, Math.min(600, newWidth))
    sidebarWidth.value = constrainedWidth
    setLocalStorageItem(SIDEBAR_WIDTH_KEY, constrainedWidth.toString())
  }

  // Collapse all action
  const collapseAll = () => {
    expandedPaths.value.clear()
    // Keep root expanded to show first-level items
    expandedPaths.value.add('/')
  }

  const hasExpandedPaths = computed(() => expandedPaths.value.size > 0)

  // Sidebar actions
  const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  const toggleSidebarPin = () => {
    isSidebarPinned.value = !isSidebarPinned.value
  }

  const collapseSidebarIfNotPinned = () => {
    if (!isSidebarPinned.value) {
      isSidebarCollapsed.value = true
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
    sortBy,
    sortOrder,
    sortDirectoriesWithFiles,
    isSidebarCollapsed,
    isSidebarPinned,
    sidebarWidth,
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
    restoreLastSelectedNote,
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
    toggleSortDirectoriesWithFiles,
    // Collapse all action
    collapseAll,
    // Sidebar actions
    toggleSidebar,
    toggleSidebarPin,
    collapseSidebarIfNotPinned,
    setSidebarWidth,
    // Path expansion utility
    expandToPath
  }
})

