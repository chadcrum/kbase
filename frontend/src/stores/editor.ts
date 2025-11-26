import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const EDITOR_STORAGE_KEY = 'kbase_editor_preference'


export type EditorType = 'codemirror' | 'milkdown'



export const useEditorStore = defineStore('editor', () => {
  // State - editor preference for markdown files
  // Default to 'codemirror' for backward compatibility
  const markdownEditor = ref<EditorType>(
    (localStorage.getItem(EDITOR_STORAGE_KEY) as EditorType) || 'codemirror'
  )



  // Get editor preference for a file based on its extension
  const getEditorForFile = (filePath: string): EditorType => {
    // Only markdown files can use Milkdown
    if (filePath.endsWith('.md')) {
      return markdownEditor.value
    }
    // All other files use CodeMirror
    return 'codemirror'
  }

  // Set editor preference for markdown files
  const setMarkdownEditor = (editor: EditorType) => {
    if (editor !== 'codemirror' && editor !== 'milkdown') {
      console.warn(`Invalid editor type: ${editor}. Must be 'codemirror' or 'milkdown'`)
      return
    }
    markdownEditor.value = editor
    localStorage.setItem(EDITOR_STORAGE_KEY, editor)
  }

  // Toggle between CodeMirror and Milkdown for markdown files
  const toggleMarkdownEditor = () => {
    const newEditor = markdownEditor.value === 'codemirror' ? 'milkdown' : 'codemirror'
    setMarkdownEditor(newEditor)
  }

  // Check if file can use Milkdown (only markdown files)
  const canUseMilkdown = (filePath: string): boolean => {
    return filePath.endsWith('.md')
  }



  return {
    // State
    markdownEditor,

    // Methods
    getEditorForFile,
    setMarkdownEditor,
    toggleMarkdownEditor,
    canUseMilkdown,
  }
})

