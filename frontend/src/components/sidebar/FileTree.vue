<template>
  <div class="file-tree">
    <FileTreeNode
      v-if="sortedFileTree"
      :node="sortedFileTree"
      :level="0"
      :expanded-paths="expandedPaths"
      @toggle-expand="handleToggleExpand"
      @select-note="handleSelectNote"
    />
    <div v-else-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading files...</span>
    </div>
    <div v-else-if="hasError" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button @click="$emit('refresh')" class="retry-button">Retry</button>
    </div>
    <div v-else class="empty-state">
      <span>No files found</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useUIStore } from '@/stores/ui'
import FileTreeNode from './FileTreeNode.vue'

// @ts-ignore
const emit = defineEmits<{
  refresh: []
}>()

// Store
const vaultStore = useVaultStore()
const uiStore = useUIStore()

// Computed properties
const isLoading = computed(() => vaultStore.isLoading)
const hasError = computed(() => vaultStore.hasError)
const error = computed(() => vaultStore.error)
const expandedPaths = computed(() => vaultStore.expandedPaths)
const sortedFileTree = computed(() => vaultStore.sortedFileTree)

// Methods
const handleToggleExpand = (path: string) => {
  vaultStore.toggleExpanded(path)
}

const handleSelectNote = (path: string) => {
  vaultStore.selectNote(path)

  // Auto-switch to editor on mobile
  if (uiStore.isMobileView) {
    uiStore.activeMobilePane = 'editor'
  }
}
</script>

<style scoped>
.file-tree {
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.loading-state {
  gap: 0.5rem;
}

.error-state {
  gap: 0.5rem;
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
  width: 20px;
  height: 20px;
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
</style>

