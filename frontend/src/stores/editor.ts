import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const EDITOR_STORAGE_KEY = 'kbase_editor_preference'
const AUTO_SAVE_ENABLED_KEY = 'kbase_auto_save_enabled'

export type EditorType = 'monaco' | 'milkdown'

const readAutoSavePreference = (): boolean => {
  if (typeof window === 'undefined') {
    return true // Default to enabled for SSR
  }
  try {
    const stored = localStorage.getItem(AUTO_SAVE_ENABLED_KEY)
    // Default to true if not set (backward compatibility)
    return stored === null ? true : stored === 'true'
  } catch {
    return true // Default to enabled on error
  }
}

export const useEditorStore = defineStore('editor', () => {
  // State - editor preference for markdown files
  // Default to 'monaco' for backward compatibility
  const markdownEditor = ref<EditorType>(
    (localStorage.getItem(EDITOR_STORAGE_KEY) as EditorType) || 'monaco'
  )

  // State - auto-save enabled/disabled
  // Default to true (enabled) for backward compatibility
  const autoSaveEnabled = ref<boolean>(readAutoSavePreference())

  // Get editor preference for a file based on its extension
  const getEditorForFile = (filePath: string): EditorType => {
    // Only markdown files can use Milkdown
    if (filePath.endsWith('.md')) {
      return markdownEditor.value
    }
    // All other files use Monaco
    return 'monaco'
  }

  // Set editor preference for markdown files
  const setMarkdownEditor = (editor: EditorType) => {
    if (editor !== 'monaco' && editor !== 'milkdown') {
      console.warn(`Invalid editor type: ${editor}. Must be 'monaco' or 'milkdown'`)
      return
    }
    markdownEditor.value = editor
    localStorage.setItem(EDITOR_STORAGE_KEY, editor)
  }

  // Toggle between Monaco and Milkdown for markdown files
  const toggleMarkdownEditor = () => {
    const newEditor = markdownEditor.value === 'monaco' ? 'milkdown' : 'monaco'
    setMarkdownEditor(newEditor)
  }

  // Check if file can use Milkdown (only markdown files)
  const canUseMilkdown = (filePath: string): boolean => {
    return filePath.endsWith('.md')
  }

  // Getter for auto-save enabled state
  const isAutoSaveEnabled = computed(() => autoSaveEnabled.value)

  // Toggle auto-save and persist to localStorage
  const toggleAutoSave = () => {
    autoSaveEnabled.value = !autoSaveEnabled.value
    try {
      localStorage.setItem(AUTO_SAVE_ENABLED_KEY, autoSaveEnabled.value ? 'true' : 'false')
    } catch {
      // Ignore storage errors (e.g., private mode, quota exceeded)
    }
  }

  return {
    // State
    markdownEditor,
    autoSaveEnabled,
    // Actions
    getEditorForFile,
    setMarkdownEditor,
    toggleMarkdownEditor,
    canUseMilkdown,
    isAutoSaveEnabled,
    toggleAutoSave
  }
})

