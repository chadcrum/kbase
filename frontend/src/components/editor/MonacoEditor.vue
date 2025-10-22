<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import loader from '@monaco-editor/loader'
import { detectLanguage } from '@/utils/languageDetection'
import type * as Monaco from 'monaco-editor'

// Props
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
}>()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monaco: typeof Monaco | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isInternalChange = false

// Debounce delay for auto-save (1 second)
const AUTO_SAVE_DELAY = 1000

// Initialize Monaco editor
onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // Load Monaco
    monaco = await loader.init()

    // Detect language from file extension
    const language = detectLanguage(props.path)

    // Create editor instance
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      minimap: {
        enabled: true
      },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      readOnly: props.readonly,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 4,
    })

    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      if (!editor) return
      
      const value = editor.getValue()
      
      // Emit update for v-model
      isInternalChange = true
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

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (!editor || isInternalChange) {
    isInternalChange = false
    return
  }

  const currentValue = editor.getValue()
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
</style>

