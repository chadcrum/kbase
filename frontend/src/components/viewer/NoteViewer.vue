<template>
  <div class="note-viewer">
    <!-- Tabs Bar -->
    <TabsBar
      :file-path="selectedNote?.path"
      @open-search="handleOpenSearch"
    />
    
    <div v-if="selectedNote" class="note-content">
      <!-- Viewer Toolbar -->
      <ViewerToolbar
        :file-name="getNoteTitle(selectedNote.path)"
        :file-path="selectedNote.path"
      />

      <!-- Scrollable Content Area -->
      <div class="note-scroll-content">
        <!-- Editor View (Monaco or Milkdown) -->
        <div class="editor-view">
          <MilkdownEditor
            v-if="shouldUseMilkdown"
            v-model="editableContent"
            :path="selectedNote.path"
            @save="handleSave"
          />
          <MonacoEditor
            v-else
            v-model="editableContent"
            :path="selectedNote.path"
            @save="handleSave"
          />
        </div>
      
        <!-- Floating Save Status -->
        <div v-if="saveStatus" class="floating-save-status" :class="saveStatus">
          <span v-if="saveStatus === 'saving'" class="status-icon spinner">⏳</span>
          <span v-else-if="saveStatus === 'saved'" class="status-icon">✓</span>
          <span v-else-if="saveStatus === 'error'" class="status-icon">⚠️</span>
          <span class="status-text">{{ saveStatusText }}</span>
        </div>
      </div>
    </div>
    
    <div v-else-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading note...</span>
    </div>
    
    <div v-else-if="hasError" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button @click="handleRetry" class="retry-button">Retry</button>
    </div>
    
    <div v-else class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>No note selected</h2>
      <p>Select a note from the sidebar to view its content</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import TabsBar from './TabsBar.vue'
import ViewerToolbar from './ViewerToolbar.vue'
import MonacoEditor from '@/components/editor/MonacoEditor.vue'
import MilkdownEditor from '@/components/editor/MilkdownEditor.vue'

// Emits
const emit = defineEmits<{
  'openSearch': []
}>()

// Store
const vaultStore = useVaultStore()
const editorStore = useEditorStore()

// State
const editableContent = ref('')
const saveStatus = ref<'saving' | 'saved' | 'error' | null>(null)
let saveStatusTimeout: ReturnType<typeof setTimeout> | null = null

// Computed properties
const selectedNote = computed(() => vaultStore.selectedNote)
const isLoading = computed(() => vaultStore.isLoading)
const hasError = computed(() => vaultStore.hasError)
const error = computed(() => vaultStore.error)

const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
    default:
      return ''
  }
})

// Determine which editor to use based on file type and preference
const shouldUseMilkdown = computed(() => {
  if (!selectedNote.value) return false
  return editorStore.getEditorForFile(selectedNote.value.path) === 'milkdown'
})

// Watch for note changes to update editable content
watch(selectedNote, (newNote) => {
  if (newNote) {
    editableContent.value = newNote.content
  } else {
    editableContent.value = ''
  }
}, { immediate: true })

// Methods
const handleSave = async (content: string) => {
  if (!selectedNote.value) return

  // Clear any existing timeout
  if (saveStatusTimeout) {
    clearTimeout(saveStatusTimeout)
    saveStatusTimeout = null
  }

  saveStatus.value = 'saving'

  const success = await vaultStore.updateNote(selectedNote.value.path, content)

  if (success) {
    saveStatus.value = 'saved'
    // Clear the saved status after 2 seconds
    saveStatusTimeout = setTimeout(() => {
      saveStatus.value = null
    }, 2000)
  } else {
    saveStatus.value = 'error'
    // Clear the error status after 5 seconds
    saveStatusTimeout = setTimeout(() => {
      saveStatus.value = null
    }, 5000)
  }
}

const getNoteTitle = (path: string): string => {
  // Extract filename from path
  const parts = path.split('/')
  const filename = parts[parts.length - 1]
  
  // Remove .md extension if present
  if (filename.endsWith('.md')) {
    return filename.slice(0, -3)
  }
  
  return filename || 'Untitled'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

const handleRetry = () => {
  if (selectedNote.value) {
    vaultStore.loadNote(selectedNote.value.path)
  }
}

const handleOpenSearch = () => {
  emit('openSearch')
}
</script>

<style scoped>
.note-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-secondary);
  transition: background-color 0.3s ease;
}

.note-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: var(--tabs-bar-height);
}

.note-scroll-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}

.editor-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}


.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.loading-state {
  gap: 0.5rem;
}

.error-state {
  gap: 0.5rem;
}

.empty-state {
  gap: 1rem;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
}

.error-icon {
  font-size: 1.5rem;
}

.retry-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.retry-button:hover {
  background: #5a67d8;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}


/* Floating save status indicator */
.floating-save-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

.floating-save-status.saving {
  background: #fef3c7;
  color: #92400e;
}

.floating-save-status.saved {
  background: #d1fae5;
  color: #065f46;
}

.floating-save-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.floating-save-status .status-icon {
  font-size: 1rem;
  line-height: 1;
}

.floating-save-status .status-icon.spinner {
  animation: spin 1s linear infinite;
}

.floating-save-status .status-text {
  white-space: nowrap;
}

/* Responsive design */
@media (max-width: 768px) {
  .note-viewer {
    font-size: 0.875rem;
  }

  .note-content {
    padding-top: calc(var(--tabs-bar-height) + var(--pane-toolbar-height) + 0.5rem);
  }

  .floating-save-status {
    bottom: 16px;
    right: 16px;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
}
</style>

