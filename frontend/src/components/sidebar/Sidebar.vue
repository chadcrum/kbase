<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Files</h2>
      <button @click="handleRefresh" class="refresh-button" :disabled="isLoading">
        <span class="refresh-icon">🔄</span>
      </button>
    </div>
    
    <div class="sidebar-content">
      <FileTree
        :file-tree="fileTree"
        @refresh="handleRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useVaultStore } from '@/stores/vault'
import FileTree from './FileTree.vue'
// import type { FileTreeNode } from '@/types' // Not used in this component

// Store
const vaultStore = useVaultStore()

// Computed properties
const fileTree = computed(() => vaultStore.fileTree)
const isLoading = computed(() => vaultStore.isLoading)

// Methods
const handleRefresh = () => {
  vaultStore.refresh()
}

// Lifecycle
onMounted(() => {
  // Load file tree when sidebar mounts
  if (!fileTree.value) {
    vaultStore.loadFileTree()
  }
})
</script>

<style scoped>
.sidebar {
  width: 300px;
  height: 100vh;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: white;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.refresh-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.refresh-button:hover:not(:disabled) .refresh-icon {
  transform: rotate(180deg);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>

