<template>
  <div class="note-viewer">
    <div v-if="selectedNote" class="note-content">
      <!-- Viewer Toolbar -->
      <ViewerToolbar
        :file-name="getNoteTitle(selectedNote.path)"
        :file-path="selectedNote.path"
        :view-mode="viewMode"
        :save-status="saveStatus"
        @update:view-mode="viewMode = $event"
        @open-search="handleOpenSearch"
      />
      
      <!-- Monaco Editor View -->
      <div v-show="viewMode === 'editor'" class="editor-view">
        <MonacoEditor
          v-model="editableContent"
          :path="selectedNote.path"
          :disabled="viewMode !== 'editor'"
          @save="handleSave"
        />
      </div>
      
      <!-- TipTap WYSIWYG View -->
      <div v-show="viewMode === 'wysiwyg'" class="wysiwyg-view">
        <TipTapEditor
          v-model="editableContent"
          :path="selectedNote.path"
          :disabled="viewMode !== 'wysiwyg'"
          @save="handleSave"
        />
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
import ViewerToolbar from './ViewerToolbar.vue'
import MonacoEditor from '@/components/editor/MonacoEditor.vue'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'

// Emits
const emit = defineEmits<{
  'openSearch': []
}>()

// Store
const vaultStore = useVaultStore()

// State
const viewMode = ref<'editor' | 'wysiwyg'>('wysiwyg')
const editableContent = ref('')
const saveStatus = ref<'saving' | 'saved' | 'error' | null>(null)
let saveStatusTimeout: ReturnType<typeof setTimeout> | null = null

// Computed properties
const selectedNote = computed(() => vaultStore.selectedNote)
const isLoading = computed(() => vaultStore.isLoading)
const hasError = computed(() => vaultStore.hasError)
const error = computed(() => vaultStore.error)

// Watch for note changes to update editable content
watch(selectedNote, (newNote) => {
  if (newNote) {
    editableContent.value = newNote.content
    // Set default view mode: wysiwyg for .md files, editor for others
    viewMode.value = newNote.path.endsWith('.md') ? 'wysiwyg' : 'editor'
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
  background-color: white;
}

.note-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #1e1e1e;
}

.wysiwyg-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: white;
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
  color: #6b7280;
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
  color: #374151;
  margin: 0;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
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

/* Hide inactive editors properly to prevent layout issues */
.editor-view[style*="display: none"],
.wysiwyg-view[style*="display: none"] {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .note-viewer {
    font-size: 0.875rem;
  }
}
</style>

