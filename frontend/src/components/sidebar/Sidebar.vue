<template>
  <div class="sidebar">
    <FileExplorerToolbar
      :is-loading="isLoading"
      @refresh="handleRefresh"
      @scroll-to-top="handleScrollToTop"
      @open-search="handleOpenSearch"
    />
    
    <div ref="sidebarContentRef" class="sidebar-content">
      <FileTree
        :file-tree="fileTree"
        @refresh="handleRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useUIStore } from '@/stores/ui'
import FileTree from './FileTree.vue'
import FileExplorerToolbar from './FileExplorerToolbar.vue'
// import type { FileTreeNode } from '@/types' // Not used in this component

// Emits
const emit = defineEmits<{
  'open-search': []
}>()

// Store
const vaultStore = useVaultStore()
const uiStore = useUIStore()

// Template ref
const sidebarContentRef = ref<HTMLElement | null>(null)

// Computed properties
const fileTree = computed(() => vaultStore.fileTree)
const isLoading = computed(() => vaultStore.isLoading)
const sidebarWidth = computed(() => `${vaultStore.sidebarWidth}px`)
const sidebarCollapsed = computed(() => uiStore.sidebarCollapsed)

// Methods
const handleRefresh = () => {
  vaultStore.refresh()
}

/**
 * Scrolls the sidebar content to the top
 */
const handleScrollToTop = () => {
  if (sidebarContentRef.value) {
    sidebarContentRef.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

/**
 * Handles open search event
 */
const handleOpenSearch = () => {
  emit('open-search')
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
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease, opacity 0.3s ease, background-color 0.3s ease, transform 0.3s ease, left 0.3s ease, width 0.1s ease;
  flex-shrink: 0;
  z-index: 1000;
}

.sidebar.collapsed {
  margin-left: calc(-1 * v-bind(sidebarWidth));
  opacity: 0;
  pointer-events: none;
}

.sidebar.mobile-hidden {
  display: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
  /* Firefox scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary, rgba(128, 128, 128, 0.3)) transparent;
}

/* Thin scrollbar styling - only visible when scrolling is needed */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background-color: var(--text-tertiary, rgba(128, 128, 128, 0.3));
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary, rgba(128, 128, 128, 0.5));
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

