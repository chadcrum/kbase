import { defineStore } from 'pinia'
import { ref } from 'vue'

const EDITOR_STORAGE_KEY = 'kbase_editor_preference'

export type EditorType = 'monaco' | 'milkdown'

export const useEditorStore = defineStore('editor', () => {
  // State - editor preference for markdown files
  // Default to 'monaco' for backward compatibility
  const markdownEditor = ref<EditorType>(
    (localStorage.getItem(EDITOR_STORAGE_KEY) as EditorType) || 'monaco'
  )

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

  return {
    // State
    markdownEditor,
    // Actions
    getEditorForFile,
    setMarkdownEditor,
    toggleMarkdownEditor,
    canUseMilkdown
  }
})

