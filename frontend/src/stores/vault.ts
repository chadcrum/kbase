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
    clearSaveError
  }
})

