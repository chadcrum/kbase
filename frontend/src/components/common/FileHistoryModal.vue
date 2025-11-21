<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && !showRestoreConfirm" class="history-overlay" @click="handleClose">
        <div class="history-container" @click.stop>
          <div class="history-header">
            <button class="history-btn history-btn-close" @click="handleClose" title="Close">
              <span class="history-btn-icon">✕</span>
            </button>
            <div class="history-title">
              <div class="history-name">{{ noteName }}</div>
              <div class="history-path">{{ notePath }}</div>
            </div>
            <button 
              class="history-btn history-btn-restore" 
              @click="handleRestoreClick" 
              title="Restore this version"
              :disabled="!selectedCommit || selectedCommit.is_current || isLoading"
            >
              <span class="history-btn-icon">↩️</span>
            </button>
          </div>
          
          <div class="history-controls">
            <div class="commit-selector">
              <label class="commit-label" for="commit-select">Version:</label>
              <select
                id="commit-select"
                v-model="selectedCommitHash"
                @change="handleCommitChange"
                class="commit-select"
                :disabled="isLoading || commits.length === 0"
              >
                <option v-if="commits.length === 0" value="">No commit history</option>
                <option
                  v-for="commit in commits"
                  :key="commit.hash"
                  :value="commit.hash"
                >
                  {{ formatCommitDisplay(commit) }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="history-content-wrapper">
            <div v-if="isLoading" class="history-loading">
              <div class="loading-spinner">⏳</div>
              <div>Loading version...</div>
            </div>
            <div v-else-if="commits.length === 0" class="history-empty">
              <div class="empty-icon">📜</div>
              <div class="empty-message">No commit history</div>
              <div class="empty-hint">This file has not been committed yet.</div>
            </div>
            <div v-else class="history-content">{{ displayedContent }}</div>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Restore Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showRestoreConfirm"
      title="Restore File Version"
      :message="restoreConfirmMessage"
      confirm-text="Restore"
      cancel-text="Cancel"
      :is-dangerous="false"
      @confirm="handleRestoreConfirm"
      @cancel="showRestoreConfirm = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'
import { useVaultStore } from '@/stores/vault'
import type { CommitInfo, FileHistoryResponse, FileContentAtCommitResponse } from '@/types'
import ConfirmDialog from './ConfirmDialog.vue'

interface Props {
  isOpen: boolean
  notePath: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  restored: [path: string]
}>()

const commits = ref<CommitInfo[]>([])
const selectedCommitHash = ref<string>('')
const displayedContent = ref('')
const isLoading = ref(false)
const showRestoreConfirm = ref(false)

const noteName = computed(() => {
  if (!props.notePath) return ''
  const parts = props.notePath.split('/')
  return parts[parts.length - 1] || props.notePath
})

const selectedCommit = computed(() => {
  return commits.value.find(c => c.hash === selectedCommitHash.value) || null
})

const restoreConfirmMessage = computed(() => {
  if (!selectedCommit.value) return ''
  const timestamp = formatTimestamp(selectedCommit.value.timestamp)
  const shortHash = selectedCommit.value.hash.substring(0, 8)
  return `Are you sure you want to restore this file to the version from:\n\n${timestamp}\nCommit: ${shortHash}\n\nYour current state will be saved and committed before restoring. You can revert back to the current version later.`
})

const handleClose = () => {
  emit('close')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isOpen) return
  
  if (event.key === 'Escape') {
    handleClose()
  }
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

const formatCommitDisplay = (commit: CommitInfo): string => {
  const timestamp = formatTimestamp(commit.timestamp)
  const shortHash = commit.hash.substring(0, 8)
  const currentLabel = commit.is_current ? ' (Current)' : ''
  // Include commit message if available (truncate if too long)
  const message = commit.message ? (commit.message.length > 50 ? commit.message.substring(0, 47) + '...' : commit.message) : ''
  const messagePart = message ? ` - ${message}` : ''
  return `${timestamp} - ${shortHash}${messagePart}${currentLabel}`
}

const loadHistory = async () => {
  if (!props.notePath || !props.isOpen) {
    commits.value = []
    selectedCommitHash.value = ''
    displayedContent.value = ''
    return
  }

  isLoading.value = true
  try {
    // First, commit the current state to ensure it's saved
    try {
      await apiClient.commitFile(props.notePath)
    } catch (error: any) {
      // Log but continue - commit might fail if no changes or git not available
      console.warn('Failed to commit current state:', error)
      if (error.response?.data?.detail) {
        console.warn('Commit error details:', error.response.data.detail)
      }
    }
    
    // Load commit history
    console.log('Loading history for file:', props.notePath)
    const history: FileHistoryResponse = await apiClient.getFileHistory(props.notePath)
    commits.value = history.commits
    console.log('Loaded commits:', commits.value.length)
    
    if (commits.value.length > 0) {
      // Select current commit or first commit
      const currentCommit = commits.value.find(c => c.is_current)
      selectedCommitHash.value = currentCommit ? currentCommit.hash : commits.value[0].hash
      await loadCommitContent(selectedCommitHash.value)
    } else {
      // Load current file content if no history
      console.warn('No commit history found for file:', props.notePath)
      await loadCurrentContent()
    }
  } catch (error: any) {
    console.error('Failed to load file history:', error)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    commits.value = []
    displayedContent.value = `Error loading file history: ${error.response?.data?.detail || error.message || 'Unknown error'}`
  } finally {
    isLoading.value = false
  }
}

const loadCurrentContent = async () => {
  if (!props.notePath) return
  
  try {
    const noteData = await apiClient.getNote(props.notePath)
    displayedContent.value = noteData.content
  } catch (error) {
    console.error('Failed to load current content:', error)
    displayedContent.value = 'Error loading file content.'
  }
}

const loadCommitContent = async (commitHash: string) => {
  if (!props.notePath) return
  
  isLoading.value = true
  try {
    const contentData: FileContentAtCommitResponse = await apiClient.getFileContentAtCommit(
      props.notePath,
      commitHash
    )
    displayedContent.value = contentData.content
  } catch (error) {
    console.error('Failed to load commit content:', error)
    displayedContent.value = 'Error loading version content.'
  } finally {
    isLoading.value = false
  }
}

const handleCommitChange = async () => {
  if (selectedCommitHash.value) {
    await loadCommitContent(selectedCommitHash.value)
  }
}

const handleRestoreClick = () => {
  if (!selectedCommit.value || selectedCommit.value.is_current) return
  showRestoreConfirm.value = true
}

const handleRestoreConfirm = async () => {
  if (!props.notePath || !selectedCommit.value) return
  
  showRestoreConfirm.value = false
  isLoading.value = true
  
  try {
    console.log('Starting restore process for:', props.notePath, 'commit:', selectedCommit.value.hash)
    
    // Wait for any in-flight saves to complete before restoring
    // This prevents race conditions where a pending save might overwrite the restored content
    const vaultStore = useVaultStore()
    let waitCount = 0
    const maxWait = 50 // Wait up to 5 seconds (50 * 100ms)
    while (vaultStore.isSaving && waitCount < maxWait) {
      console.log('Waiting for in-flight save to complete...')
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
    
    if (vaultStore.isSaving) {
      console.warn('Save operation still in progress after timeout, proceeding anyway')
    } else {
      console.log('All in-flight saves completed')
    }
    
    // Commit current state first (this ensures current state is saved)
    console.log('Committing current state...')
    await apiClient.commitFile(props.notePath)
    console.log('Current state committed')
    
    // Small delay to ensure commit is fully processed
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Restore from commit
    console.log('Restoring from commit...')
    await apiClient.restoreFileFromCommit(props.notePath, selectedCommit.value.hash)
    console.log('File restored successfully')
    
    // Wait a bit to ensure file is fully written to disk
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Save path before closing (since close handler clears it)
    const restoredPath = props.notePath
    
    // Close modal first
    handleClose()
    
    // Small delay to ensure modal closes before emitting restored event
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Emit restored event with path to trigger note reload
    if (restoredPath) {
      console.log('Emitting restored event for:', restoredPath)
      emit('restored', restoredPath)
    }
  } catch (error: any) {
    console.error('Failed to restore file:', error)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      alert(`Failed to restore file: ${error.response.data?.detail || error.message || 'Unknown error'}`)
    } else {
      alert(`Failed to restore file: ${error.message || 'Unknown error'}`)
    }
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    loadHistory()
  } else {
    commits.value = []
    selectedCommitHash.value = ''
    displayedContent.value = ''
  }
})

watch(() => props.notePath, () => {
  if (props.isOpen) {
    loadHistory()
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.history-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.history-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 25px 80px var(--shadow);
  width: 90vw;
  height: 90vh;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--border-color);
  min-height: 64px;
  gap: 1rem;
}

.history-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-path {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 1.2rem;
}

.history-btn:hover:not(:disabled) {
  background: var(--border-color);
  transform: scale(1.05);
}

.history-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-btn:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.history-btn-restore {
  background: #667eea;
  color: white;
}

.history-btn-restore:hover:not(:disabled) {
  background: #5a67d8;
}

.history-btn-icon {
  line-height: 1;
}

.history-controls {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.commit-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.commit-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.commit-select {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.commit-select:hover:not(:disabled) {
  border-color: #667eea;
}

.commit-select:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
  border-color: #667eea;
}

.commit-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.history-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.history-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
  padding: 2rem;
}

.empty-icon {
  font-size: 3rem;
}

.empty-message {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling */
.history-content::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.history-content::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.history-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 6px;
}

.history-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .history-container,
.modal-leave-active .history-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .history-container,
.modal-leave-to .history-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .history-container {
    width: 95vw;
    height: 85vh;
    max-width: 95vw;
    max-height: 85vh;
    border-radius: 12px;
  }

  .history-header {
    padding: 0.75rem 1rem;
    min-height: 56px;
  }

  .history-name {
    font-size: 1rem;
  }

  .history-path {
    font-size: 0.75rem;
  }

  .history-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .history-content {
    padding: 1rem;
    font-size: 0.85rem;
  }

  .history-controls {
    padding: 0.75rem 1rem;
  }
}
</style>

