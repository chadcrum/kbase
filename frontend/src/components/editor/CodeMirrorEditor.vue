<template>
  <div 
    ref="editorContainer" 
    class="codemirror-editor-container"
    @mousedown="handleEditorClick"
    @touchstart="handleEditorClick"
    @paste="handlePaste"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorState, Extension } from '@codemirror/state'
import { EditorView, keymap, ViewUpdate, lineNumbers, drawSelection } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { searchKeymap, search } from '@codemirror/search'
import { oneDark } from '@codemirror/theme-one-dark'
import { useThemeStore } from '@/stores/theme'
import { useVaultStore } from '@/stores/vault'
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

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let stateSaveTimeout: ReturnType<typeof setTimeout> | null = null
let lastSavedValue = ref<string>(props.modelValue)

// Auto-save debounce (1 second)
const AUTO_SAVE_DELAY = 1000
const STATE_SAVE_DELAY = 150

const scheduleStateSave = () => {
  if (!editorView || !props.path) return

  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }

  stateSaveTimeout = setTimeout(() => {
    if (!editorView || !props.path) return

    const state = editorView.state
    const selection = state.selection.main
    
    // Save selection and scroll position
    const scrollTop = editorView.scrollDOM.scrollTop
    
    updateNoteStateSegment(props.path, 'codemirror', {
      selection: {
        from: selection.from,
        to: selection.to
      },
      scrollTop
    })
  }, STATE_SAVE_DELAY)
}

const restoreEditorState = () => {
  if (!editorView || !props.path) return

  const stored = loadNoteState(props.path)
  const codemirrorState = stored?.codemirror
  if (!codemirrorState) return

  try {
    // Restore selection
    if (codemirrorState.selection) {
      const { from, to } = codemirrorState.selection
      editorView.dispatch({
        selection: { anchor: from, head: to }
      })
    }
    
    // Restore scroll position
    if (codemirrorState.scrollTop !== undefined) {
      nextTick(() => {
        if (editorView && codemirrorState.scrollTop !== undefined) {
          editorView.scrollDOM.scrollTop = codemirrorState.scrollTop
        }
      })
    }
    
    editorView.focus()
  } catch (error) {
    console.warn('Failed to restore CodeMirror state:', error)
    // If restoration fails, just focus the editor
    editorView.focus()
  }
}

// Public method to focus the editor
const focus = () => {
  if (!editorView || props.disabled) return
  editorView.focus()
}

// Expose focus method to parent component
defineExpose({
  focus
})

// Detect mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || 
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Get editor extensions based on current settings
const getExtensions = (): Extension[] => {
  const isMobile = isMobileDevice()
  const extensions: Extension[] = [
    // Basic editor configuration
    EditorState.tabSize.of(2),
    EditorView.lineWrapping,
    EditorView.editable.of(!props.readonly && !props.disabled),
    // Line numbers (disabled on mobile)
    ...(isMobile ? [] : [lineNumbers()]),
    
    // Draw selection (improves selection visibility)
    drawSelection(),
    
    // Search functionality
    search(),
    
    // Key bindings
    keymap.of([
      indentWithTab, // Tab/Shift-Tab for indentation
      ...searchKeymap, // Built-in search (Ctrl+F)
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          if (props.readonly || props.disabled) return false
          const value = editorView?.state.doc.toString() || ''
          lastSavedValue.value = value
          emit('save', value)
          return true
        }
      },
      {
        key: 'Mod-r',
        preventDefault: true,
        run: () => {
          if (props.readonly || props.disabled) return false
          // Redo is handled by default history extension
          return false
        }
      }
    ]),
    
    // Update listener for auto-save and state persistence
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && !props.disabled) {
        const value = update.state.doc.toString()
        
        // Emit update for v-model
        emit('update:modelValue', value)
        
        // Debounced auto-save
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        
        saveTimeout = setTimeout(() => {
          if (!editorView || props.disabled) return
          
          const currentValue = editorView.state.doc.toString()
          // Only save if content has changed since last save
          if (currentValue !== lastSavedValue.value) {
            lastSavedValue.value = currentValue
            emit('save', currentValue)
          }
        }, AUTO_SAVE_DELAY)
      }
      
      // Save state on selection/cursor changes
      if (update.selectionSet || update.viewportChanged) {
        scheduleStateSave()
      }
    }),
    
    // Theme
    themeStore.isDarkMode ? oneDark : []
  ]

  return extensions
}

// Handle editor click to auto-collapse sidebar if not pinned
const handleEditorClick = () => {
  if (props.disabled) return
  vaultStore.collapseSidebarIfNotPinned()
}

// Handle image paste
const handlePaste = async (event: ClipboardEvent) => {
  if (props.disabled || props.readonly || !editorView) return

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
  if (!editorView) return

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
  const state = editorView.state
  const selection = state.selection.main
  const from = selection.from
  const to = selection.to

  // Create markdown image syntax
  const imageMarkdown = `![${altText}](${imageUrl})`

  // Insert the markdown at cursor position
  editorView.dispatch({
    changes: {
      from,
      to,
      insert: imageMarkdown
    },
    selection: {
      anchor: from + imageMarkdown.length
    }
  })
}

// Initialize CodeMirror editor
onMounted(() => {
  if (!editorContainer.value) return

  try {
    // Create initial state
    const initialState = EditorState.create({
      doc: props.modelValue || '',
      extensions: getExtensions()
    })

    // Create editor view
    editorView = new EditorView({
      state: initialState,
      parent: editorContainer.value
    })

    // Restore editor state if available
    nextTick(() => {
      restoreEditorState()
    })

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      // CodeMirror automatically handles resize, but we can force a refresh if needed
      editorView?.requestMeasure()
    })
    
    if (editorContainer.value) {
      resizeObserver.observe(editorContainer.value)
    }

    // Cleanup function for resize observer
    onBeforeUnmount(() => {
      resizeObserver.disconnect()
    })
  } catch (error) {
    console.error('Failed to initialize CodeMirror editor:', error)
  }
})

// Watch for external content changes
watch(() => props.modelValue, (newValue, oldValue) => {
  // Skip if no editor
  if (!editorView) return

  const currentValue = editorView.state.doc.toString()
  const newValueStr = newValue || ''
  const currentValueStr = currentValue || ''
  
  // Only update if content actually changed
  // This prevents clearing the undo stack when save updates the same content
  const contentChanged = newValueStr !== currentValueStr
  
  // Force update only if this is initial load (oldValue was null/undefined)
  const isInitialLoad = oldValue === undefined || oldValue === null
  
  const shouldUpdate = contentChanged || isInitialLoad
  
  if (shouldUpdate) {
    if (contentChanged || isInitialLoad) {
      console.log('CodeMirrorEditor: Updating content', {
        newLength: newValueStr.length,
        currentLength: currentValueStr.length,
        forced: isInitialLoad
      })
      
      // Update editor content
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValueStr
        }
      })
    }
    
    // Update last saved value when note content changes externally
    if (contentChanged || isInitialLoad) {
      lastSavedValue.value = newValueStr
      nextTick(() => {
        restoreEditorState()
      })
    }
  }
})

// Watch for path changes
watch(() => props.path, (newPath, oldPath) => {
  if (!editorView) return

  nextTick(() => {
    if (!editorView) return
    restoreEditorState()
    // If path changed and there's no stored state, focus the editor
    if (oldPath !== newPath) {
      const stored = loadNoteState(newPath)
      if (!stored?.codemirror) {
        // No stored state, so focus at the beginning
        editorView.dispatch({
          selection: { anchor: 0 }
        })
        editorView.focus()
      }
    }
  })
})

// Watch for theme changes
watch(() => themeStore.isDarkMode, () => {
  if (!editorView) return
  
  // Recreate editor with new theme
  const currentContent = editorView.state.doc.toString()
  const newState = EditorState.create({
    doc: currentContent,
    extensions: getExtensions()
  })
  
  // Preserve selection
  const selection = editorView.state.selection.main
  editorView.setState(newState)
  editorView.dispatch({
    selection: { anchor: selection.from, head: selection.to }
  })
})

// Watch for readonly/disabled changes
watch([() => props.readonly, () => props.disabled], () => {
  if (!editorView) return
  
  // Update editable state
  const newState = EditorState.create({
    doc: editorView.state.doc.toString(),
    extensions: getExtensions()
  })
  
  // Preserve selection and scroll position
  const selection = editorView.state.selection.main
  editorView.setState(newState)
  editorView.dispatch({
    selection: { anchor: selection.from, head: selection.to }
  })
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }
  
  if (editorView) {
    // Save state before destroying
    const state = editorView.state
    const selection = state.selection.main
    const scrollTop = editorView.scrollDOM.scrollTop
    
    if (props.path) {
      updateNoteStateSegment(props.path, 'codemirror', {
        selection: {
          from: selection.from,
          to: selection.to
        },
        scrollTop
      })
    }

    editorView.destroy()
    editorView = null
  }
})
</script>

<style scoped>
.codemirror-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.codemirror-editor-container :deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
}

.codemirror-editor-container :deep(.cm-scroller) {
  overflow: auto;
}

.codemirror-editor-container :deep(.cm-content) {
  min-height: 100%;
  padding: 1em;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .codemirror-editor-container {
    min-height: 300px;
  }
  
  .codemirror-editor-container :deep(.cm-editor) {
    font-size: 16px; /* Prevent zoom on iOS focus */
  }
  
  .codemirror-editor-container :deep(.cm-scroller) {
    -webkit-overflow-scrolling: touch;
  }
  
  .codemirror-editor-container :deep(.cm-content) {
    padding: 0.75em;
  }
  
  .codemirror-editor-container :deep(.cm-gutters) {
    display: none;
  }
}
</style>

