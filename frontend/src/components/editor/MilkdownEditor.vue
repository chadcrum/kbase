<template>
  <div class="milkdown-editor-container">
    <!-- Pane Controls -->
    <div class="pane-controls">
      <button
        @click="setViewMode('both')"
        :class="{ 'is-active': viewMode === 'both' }"
        class="pane-btn"
        title="Show both panes"
      >
        <span>📄</span>
      </button>
      <button
        @click="setViewMode('source')"
        :class="{ 'is-active': viewMode === 'source' }"
        class="pane-btn"
        title="Source only"
      >
        <span>&lt;/&gt;</span>
      </button>
      <button
        @click="setViewMode('preview')"
        :class="{ 'is-active': viewMode === 'preview' }"
        class="pane-btn"
        title="Preview only"
      >
        <span>👁</span>
      </button>
    </div>

    <!-- Split Pane Layout -->
    <div class="split-container">
      <!-- Source Pane -->
      <div 
        v-show="viewMode === 'both' || viewMode === 'source'"
        class="source-pane"
        :class="{ 'full-width': viewMode === 'source' }"
      >
        <div ref="editorRef" class="editor-wrapper">
          <!-- Simple textarea for now -->
          <textarea
            ref="textareaRef"
            v-model="localContent"
            :disabled="disabled"
            class="markdown-textarea"
            placeholder="Start typing your markdown..."
            @input="handleInput"
            @keydown="handleKeydown"
          ></textarea>
        </div>
      </div>

      <!-- Resizer -->
      <div 
        v-show="viewMode === 'both'"
        class="resizer"
        @mousedown="startResize"
      ></div>

      <!-- Preview Pane -->
      <div 
        v-show="viewMode === 'both' || viewMode === 'preview'"
        class="preview-pane"
        :class="{ 'full-width': viewMode === 'preview' }"
      >
        <div ref="previewRef" class="preview-wrapper"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useThemeStore } from '@/stores/theme'
import { marked } from 'marked'

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

// Stores
const vaultStore = useVaultStore()
const themeStore = useThemeStore()

// Refs
const editorRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// Debounce delay for auto-save (1 second) - same as Monaco/TipTap
const AUTO_SAVE_DELAY = 1000

// Pane visibility state
const viewMode = ref<'both' | 'source' | 'preview'>('both')

// Local content state
const localContent = ref(props.modelValue)

// Handle textarea input
const handleInput = () => {
  emit('update:modelValue', localContent.value)
  
  // Debounced auto-save
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    emit('save', localContent.value)
  }, AUTO_SAVE_DELAY)
  
  // Update preview
  updatePreview()
}

// Handle keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    
    const textarea = textareaRef.value
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    
    if (e.shiftKey) {
      // Shift+Tab: Remove indentation
      const lines = value.split('\n')
      const startLine = value.substring(0, start).split('\n').length - 1
      const endLine = value.substring(0, end).split('\n').length - 1
      
      for (let i = startLine; i <= endLine; i++) {
        if (lines[i].startsWith('    ')) {
          lines[i] = lines[i].substring(4)
        } else if (lines[i].startsWith('\t')) {
          lines[i] = lines[i].substring(1)
        }
      }
      
      const newValue = lines.join('\n')
      localContent.value = newValue
      textarea.value = newValue
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = Math.max(0, start - 4)
        textarea.selectionEnd = Math.max(0, end - 4)
      }, 0)
    } else {
      // Tab: Add indentation
      const lines = value.split('\n')
      const startLine = value.substring(0, start).split('\n').length - 1
      const endLine = value.substring(0, end).split('\n').length - 1
      
      for (let i = startLine; i <= endLine; i++) {
        lines[i] = '    ' + lines[i]
      }
      
      const newValue = lines.join('\n')
      localContent.value = newValue
      textarea.value = newValue
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = start + 4
        textarea.selectionEnd = end + 4
      }, 0)
    }
    
    handleInput()
  }
}

// Update preview pane with rendered markdown
const updatePreview = async () => {
  if (!previewRef.value) return
  
  try {
    const html = await marked.parse(localContent.value)
    previewRef.value.innerHTML = html
  } catch (error) {
    console.error('Error parsing markdown:', error)
    previewRef.value.innerHTML = '<p>Error parsing markdown</p>'
  }
}

// Pane visibility methods
const setViewMode = (mode: 'both' | 'source' | 'preview') => {
  viewMode.value = mode
  vaultStore.setMilkdownViewMode(mode)
}

// Resize functionality
let isResizing = false
const startResize = (e: MouseEvent) => {
  isResizing = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing) return
  
  const container = document.querySelector('.split-container') as HTMLElement
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const percentage = ((e.clientX - rect.left) / rect.width) * 100
  
  // Set CSS custom property for split percentage
  document.documentElement.style.setProperty('--split-percentage', `${Math.max(20, Math.min(80, percentage))}%`)
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue
    updatePreview()
  }
})

// Watch for path changes (note switching)
watch(() => props.path, async () => {
  // Force content update when switching notes
  await nextTick()
  localContent.value = props.modelValue
  updatePreview()
})

// Lifecycle hooks
onMounted(async () => {
  // Load saved view mode preference
  viewMode.value = vaultStore.milkdownViewMode
  
  // Initial preview update
  await nextTick()
  await updatePreview()
})

onBeforeUnmount(() => {
  // Clear save timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  // Remove resize listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.milkdown-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.pane-controls {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.pane-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 2.5rem;
}

.pane-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.pane-btn.is-active {
  background: var(--accent-color);
  color: var(--accent-text);
  border-color: var(--accent-color);
}

.split-container {
  display: flex;
  flex: 1;
  height: calc(100% - 3rem);
  --split-percentage: 50%;
}

.source-pane {
  width: var(--split-percentage);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.source-pane.full-width {
  width: 100%;
  border-right: none;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 1rem;
  resize: none;
  tab-size: 4;
}

.markdown-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.resizer {
  width: 4px;
  background: var(--border-color);
  cursor: col-resize;
  transition: background-color 0.2s ease;
}

.resizer:hover {
  background: var(--accent-color);
}

.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-pane.full-width {
  width: 100%;
}

.preview-wrapper {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: var(--bg-primary);
}

/* Markdown preview styles */
:deep(.preview-wrapper) {
  line-height: 1.6;
}

:deep(.preview-wrapper h1) {
  font-size: 2rem;
  font-weight: bold;
  margin: 1.5rem 0 1rem 0;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0.5rem;
}

:deep(.preview-wrapper h2) {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1.25rem 0 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.25rem;
}

:deep(.preview-wrapper h3) {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 1rem 0 0.5rem 0;
}

:deep(.preview-wrapper h4) {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0.75rem 0 0.5rem 0;
}

:deep(.preview-wrapper h5) {
  font-size: 1rem;
  font-weight: bold;
  margin: 0.5rem 0 0.25rem 0;
}

:deep(.preview-wrapper h6) {
  font-size: 0.9rem;
  font-weight: bold;
  margin: 0.5rem 0 0.25rem 0;
}

:deep(.preview-wrapper p) {
  margin: 0.75rem 0;
}

:deep(.preview-wrapper ul),
:deep(.preview-wrapper ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

:deep(.preview-wrapper li) {
  margin: 0.25rem 0;
}

:deep(.preview-wrapper blockquote) {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--accent-color);
  background: var(--bg-secondary);
  border-radius: 0 0.25rem 0.25rem 0;
}

:deep(.preview-wrapper code) {
  background: var(--bg-secondary);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875em;
}

:deep(.preview-wrapper pre) {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}

:deep(.preview-wrapper pre code) {
  background: none;
  padding: 0;
}

:deep(.preview-wrapper table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

:deep(.preview-wrapper th),
:deep(.preview-wrapper td) {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

:deep(.preview-wrapper th) {
  background: var(--bg-secondary);
  font-weight: bold;
}

:deep(.preview-wrapper hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 2rem 0;
}

/* Task list styles */
:deep(.preview-wrapper ul) {
  list-style-type: disc;
}

:deep(.preview-wrapper ul ul) {
  list-style-type: circle;
}

:deep(.preview-wrapper ul ul ul) {
  list-style-type: square;
}

:deep(.preview-wrapper input[type="checkbox"]) {
  margin-right: 0.5rem;
  cursor: pointer;
}

:deep(.preview-wrapper li:has(input[type="checkbox"])) {
  list-style: none;
  margin-left: -1.5rem;
}

:deep(.preview-wrapper li:has(input[type="checkbox"]:checked)) {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

/* Responsive design */
@media (max-width: 768px) {
  .split-container {
    flex-direction: column;
  }
  
  .source-pane {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .resizer {
    width: 100%;
    height: 4px;
    cursor: row-resize;
  }
}
</style>