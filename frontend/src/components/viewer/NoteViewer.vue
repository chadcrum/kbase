<template>
  <div class="note-viewer">
    <div v-if="selectedNote" class="note-content">
      <!-- Note header with metadata -->
      <div class="note-header">
        <h1 class="note-title">{{ getNoteTitle(selectedNote.path) }}</h1>
        <div class="note-metadata">
          <span class="metadata-item">
            <span class="metadata-label">Path:</span>
            <span class="metadata-value">{{ selectedNote.path }}</span>
          </span>
          <span class="metadata-item">
            <span class="metadata-label">Size:</span>
            <span class="metadata-value">{{ formatFileSize(selectedNote.size) }}</span>
          </span>
          <span class="metadata-item">
            <span class="metadata-label">Modified:</span>
            <span class="metadata-value">{{ formatDate(selectedNote.modified) }}</span>
          </span>
        </div>
      </div>
      
      <!-- Note content -->
      <div class="note-body">
        <pre class="note-text">{{ selectedNote.content }}</pre>
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
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import type { NoteData } from '@/types'

// Store
const vaultStore = useVaultStore()

// Computed properties
const selectedNote = computed(() => vaultStore.selectedNote)
const isLoading = computed(() => vaultStore.isLoading)
const hasError = computed(() => vaultStore.hasError)
const error = computed(() => vaultStore.error)

// Methods
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

.note-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.note-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.note-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
}

.metadata-item {
  display: flex;
  gap: 0.25rem;
}

.metadata-label {
  font-weight: 500;
  color: #6b7280;
}

.metadata-value {
  color: #374151;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.note-body {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

.note-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
  background: none;
  border: none;
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
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

/* Responsive design */
@media (max-width: 768px) {
  .note-header {
    padding: 1rem;
  }
  
  .note-body {
    padding: 1rem;
  }
  
  .note-metadata {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>

