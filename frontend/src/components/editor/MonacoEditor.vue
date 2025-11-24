<template>
  <div 
    ref="editorContainer" 
    class="monaco-editor-container"
    @mousedown="handleEditorClick"
    @touchstart="handleEditorClick"
    @paste="handlePaste"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import loader from '@monaco-editor/loader'
import { detectLanguage } from '@/utils/languageDetection'
import { useThemeStore } from '@/stores/theme'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import type * as Monaco from 'monaco-editor'
import { loadNoteState, updateNoteStateSegment } from '@/utils/noteState'
import { apiClient } from '@/api/client'

// Props
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
}>()

// Store
const themeStore = useThemeStore()
const vaultStore = useVaultStore()
const editorStore = useEditorStore()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monaco: typeof Monaco | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let stateSaveTimeout: ReturnType<typeof setTimeout> | null = null
let eventDisposables: Monaco.IDisposable[] = []

// Debounce delay for auto-save (1 second)
const AUTO_SAVE_DELAY = 1000
const STATE_SAVE_DELAY = 150

const scheduleStateSave = () => {
  if (!editor || !props.path) return

  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }

  stateSaveTimeout = setTimeout(() => {
    if (!editor || !props.path) return

    const viewState = editor.saveViewState()
    if (!viewState) return

    updateNoteStateSegment(props.path, 'monaco', {
      viewState
    })
  }, STATE_SAVE_DELAY)
}

const restoreEditorState = () => {
  if (!editor || !monaco || !props.path) return

  const stored = loadNoteState(props.path)
  const viewState = stored?.monaco?.viewState
  if (!viewState) return

  editor.restoreViewState(viewState as Monaco.editor.ICodeEditorViewState)
  editor.focus()
}

// Public method to focus the editor
const focus = () => {
  if (!editor || props.disabled) return
  editor.focus()
}

// Expose focus method to parent component
defineExpose({
  focus
})

// Helper to set theme based on dark mode
const setEditorTheme = () => {
  if (!editor || !monaco) return
  const theme = themeStore.isDarkMode ? 'vs-dark' : 'vs-light'
  monaco.editor.setTheme(theme)
}

// Handle editor click to auto-collapse sidebar if not pinned
const handleEditorClick = () => {
  if (props.disabled) return
  vaultStore.collapseSidebarIfNotPinned()
}

// Handle image paste
const handlePaste = async (event: ClipboardEvent) => {
  if (props.disabled || props.readonly || !editor) return

  const items = event.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()

      try {
        const file = item.getAsFile()
        if (file) {
          const imagePath = await apiClient.uploadImage(file)
          await insertImageAtCursor(imagePath, file.name)
        }
      } catch (error) {
        console.error('Failed to upload pasted image:', error)
      }
      break // Only handle the first image
    }
  }
}

// Insert image markdown at cursor position
const insertImageAtCursor = async (imagePath: string, filename: string) => {
  if (!editor) return

  const altText = filename.replace(/\.[^/.]+$/, '') // Remove extension for alt text

  // Convert image path to API endpoint URL
  // Backend returns paths like "/_resources/image.png"
  // We need to convert to "/api/v1/images/_resources/image.png"
  let imageUrl = imagePath
  if (imagePath.startsWith('/_resources/')) {
    // Extract just the filename from the path
    const filename = imagePath.replace('/_resources/', '')
    imageUrl = `/api/v1/images/${filename}`
  } else if (imagePath.startsWith('_resources/')) {
    imageUrl = `/api/v1/images/${imagePath}`
  }

  // Get current selection/cursor position
  const selection = editor.getSelection()
  if (!selection) return

  // Create markdown image syntax
  const imageMarkdown = `![${altText}](${imageUrl})`

  // Insert the markdown at cursor position
  editor.executeEdits('insert-image', [
    {
      range: selection,
      text: imageMarkdown,
    },
  ])

  // Move cursor after the inserted text
  const position = selection.startColumn + imageMarkdown.length
  editor.setPosition({
    lineNumber: selection.startLineNumber,
    column: position,
  })
}

// Initialize Monaco editor
onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // Load Monaco
    monaco = await loader.init()

    // Detect language from file extension
    const language = detectLanguage(props.path)

    // Detect if mobile device
    const isMobile = window.innerWidth <= 768
    
    // Create editor instance with theme matching app theme
    const initialTheme = themeStore.isDarkMode ? 'vs-dark' : 'vs-light'
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language,
      theme: initialTheme,
      automaticLayout: true,
      fontSize: isMobile ? 14 : 14,
      lineNumbers: isMobile ? 'off' : 'on',
      minimap: {
        enabled: !isMobile
      },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      readOnly: props.readonly,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      folding: true,
      lineDecorationsWidth: isMobile ? 4 : 10,
      lineNumbersMinChars: isMobile ? 3 : 4,
      // Mobile-specific optimizations
      contextmenu: !isMobile,
      mouseWheelZoom: !isMobile,
    })
    
    // Register editor event listeners for state persistence
    const cursorDisposable = editor.onDidChangeCursorPosition(() => {
      scheduleStateSave()
    })

    const selectionDisposable = editor.onDidChangeCursorSelection(() => {
      scheduleStateSave()
    })

    const scrollDisposable = editor.onDidScrollChange(() => {
      scheduleStateSave()
    })

    eventDisposables = [cursorDisposable, selectionDisposable, scrollDisposable]

    // Add Ctrl+R keybinding for redo
    if (monaco && editor) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR,
        () => {
          if (!editor || props.readonly || props.disabled) return
          editor.trigger('keyboard', 'redo', {})
        }
      )
    }

    // Add Ctrl+S keybinding for manual save
    if (monaco && editor) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          if (!editor || props.readonly || props.disabled) return
          // Clear any pending auto-save
          if (saveTimeout) {
            clearTimeout(saveTimeout)
            saveTimeout = null
          }
          // Immediately save
          const value = editor.getValue()
          emit('save', value)
        }
      )
    }

    // Restore editor view state if available
    nextTick(() => {
      restoreEditorState()
    })

    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      if (!editor || props.disabled) return
      
      const value = editor.getValue()
      
      // Emit update for v-model
      emit('update:modelValue', value)
      
      // Debounced auto-save (only if enabled)
      if (editorStore.isAutoSaveEnabled) {
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        
        saveTimeout = setTimeout(() => {
          emit('save', value)
        }, AUTO_SAVE_DELAY)
      }
    })

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      editor?.layout()
    })
    
    if (editorContainer.value) {
      resizeObserver.observe(editorContainer.value)
    }

    // Cleanup function for resize observer
    onBeforeUnmount(() => {
      resizeObserver.disconnect()
    })
  } catch (error) {
    console.error('Failed to initialize Monaco editor:', error)
  }
})

// Watch for external content changes (from TipTap or parent component)
watch(() => props.modelValue, (newValue, oldValue) => {
  // Skip if no editor
  if (!editor) return

  const currentValue = editor.getValue()
  // Update if content changed OR if this is a forced update (oldValue was null/undefined)
  // The oldValue check handles the case where we clear and reload after restore
  const shouldUpdate = newValue !== currentValue || (oldValue === undefined || oldValue === null)
  
  if (shouldUpdate) {
    console.log('MonacoEditor: Updating content', {
      newLength: newValue?.length,
      currentLength: currentValue?.length,
      forced: oldValue === undefined || oldValue === null
    })
    editor.setValue(newValue || '')
    nextTick(() => {
      restoreEditorState()
    })
  }
})

// Watch for path changes (language detection)
watch(() => props.path, (newPath, oldPath) => {
  if (!editor || !monaco) return

  const language = detectLanguage(newPath)
  const model = editor.getModel()
  if (model) {
    monaco.editor.setModelLanguage(model, language)
  }

  nextTick(() => {
    if (!editor) return
    restoreEditorState()
    // If path changed and there's no stored state, focus the editor
    // This ensures focus when switching between notes
    if (oldPath !== newPath) {
      const stored = loadNoteState(newPath)
      if (!stored?.monaco?.viewState) {
        // No stored state, so focus at the beginning
        editor.setPosition({ lineNumber: 1, column: 1 })
        editor.focus()
      }
    }
  })
})

// Watch for theme changes
watch(() => themeStore.isDarkMode, () => {
  setEditorTheme()
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }
  
  if (editor) {
    const viewState = editor.saveViewState()
    if (viewState && props.path) {
      updateNoteStateSegment(props.path, 'monaco', {
        viewState
      })
    }

    eventDisposables.forEach(disposable => disposable.dispose())
    eventDisposables = []
    editor.dispose()
    editor = null
  }
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .monaco-editor-container {
    min-height: 300px;
  }
}
</style>

