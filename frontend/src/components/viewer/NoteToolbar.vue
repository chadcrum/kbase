<template>
  <div class="note-toolbar" :style="{ '--toolbar-left': toolbarLeft }">
    <!-- Top Row: Navigation -->
    <NoteToolbarTop
      :file-path="filePath"
      :is-popup="isPopup"
    />

    <!-- Bottom Row: Actions -->
    <NoteToolbarActions
      :file-path="filePath"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import NoteToolbarTop from './NoteToolbarTop.vue'
import NoteToolbarActions from './NoteToolbarActions.vue'

// Props
interface Props {
  filePath?: string
  isPopup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  filePath: '',
  isPopup: false
})

// Store
const vaultStore = useVaultStore()

// Toolbar left position based on sidebar state
const toolbarLeft = computed(() => {
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})
</script>

<style scoped>
.note-toolbar {
  position: fixed;
  top: 0;
  left: var(--toolbar-left);
  right: 0;
  z-index: 11;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  transition: left 0.3s ease;
}
</style>