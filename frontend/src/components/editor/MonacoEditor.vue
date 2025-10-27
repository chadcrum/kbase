<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import loader from '@monaco-editor/loader'
import { detectLanguage } from '@/utils/languageDetection'
import { useThemeStore } from '@/stores/theme'
import type * as Monaco from 'monaco-editor'

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

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monaco: typeof Monaco | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// Debounce delay for auto-save (1 second)
const AUTO_SAVE_DELAY = 1000

// Helper to set theme based on dark mode
const setEditorTheme = () => {
  if (!editor || !monaco) return
  const theme = themeStore.isDarkMode ? 'vs-dark' : 'vs-light'
  monaco.editor.setTheme(theme)
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
    
    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      if (!editor || props.disabled) return
      
      const value = editor.getValue()
      
      // Emit update for v-model
      emit('update:modelValue', value)
      
      // Debounced auto-save
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      
      saveTimeout = setTimeout(() => {
        emit('save', value)
      }, AUTO_SAVE_DELAY)
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
watch(() => props.modelValue, (newValue) => {
  // Skip if no editor
  if (!editor) return

  const currentValue = editor.getValue()
  // Only update if content actually changed
  if (newValue !== currentValue) {
    editor.setValue(newValue)
  }
})

// Watch for path changes (language detection)
watch(() => props.path, (newPath) => {
  if (!editor || !monaco) return

  const language = detectLanguage(newPath)
  const model = editor.getModel()
  if (model) {
    monaco.editor.setModelLanguage(model, language)
  }
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
  
  if (editor) {
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

