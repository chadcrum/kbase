<template>
  <div class="sidebar">
    <FileExplorerToolbar 
      :is-loading="isLoading"
      @refresh="handleRefresh"
    />
    
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
import FileExplorerToolbar from './FileExplorerToolbar.vue'
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
  transition: margin-left 0.3s ease, opacity 0.3s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  margin-left: -300px;
  opacity: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>

