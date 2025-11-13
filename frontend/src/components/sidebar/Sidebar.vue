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
const sidebarWidth = computed(() => `${vaultStore.sidebarWidth}px`)

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
  width: v-bind(sidebarWidth);
  height: 100vh;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease, opacity 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, left 0.3s ease, width 0.1s ease;
  flex-shrink: 0;
  z-index: 1000;
}

.sidebar.collapsed {
  margin-left: calc(-1 * v-bind(sidebarWidth));
  opacity: 0;
  pointer-events: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}

/* Mobile responsive - side-by-side layout */
@media (max-width: 768px) {
  .sidebar {
    width: v-bind(sidebarWidth);
    position: relative;
    /* Keep inline flex item for side-by-side layout */
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
    margin-left: calc(-1 * v-bind(sidebarWidth));
  }
}

/* Safe area insets on mobile */
@supports (padding: max(0px)) {
  .sidebar {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>

