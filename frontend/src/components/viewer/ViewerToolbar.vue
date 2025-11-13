<template>
  <div class="viewer-toolbar" :style="{ '--toolbar-left': toolbarLeft }">
    <span v-if="filePath" class="file-path">{{ filePath }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'

// Store
const vaultStore = useVaultStore()

// Props
interface Props {
  fileName: string
  filePath?: string
}

const props = withDefaults(defineProps<Props>(), {
  filePath: ''
})

// Toolbar left position based on sidebar state
const toolbarLeft = computed(() => {
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})
</script>

<style scoped>
.viewer-toolbar {
  position: fixed;
  top: var(--tabs-bar-height);
  left: var(--toolbar-left);
  right: 0;
  z-index: 10;
  padding: 0;
  padding-left: 1rem;
  background: transparent;
  height: auto;
  min-height: 0;
  display: flex;
  align-items: center;
  transition: left 0.3s ease;
}

.file-path {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

/* Responsive design */
@media (max-width: 768px) {
  .viewer-toolbar {
    padding-left: 0.5rem;
  }

  .file-path {
    display: none;
  }
}
</style>

