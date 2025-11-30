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
      @open-search="handleOpenSearch"
      @toggle-word-wrap="handleToggleWordWrap"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useUIStore } from '@/stores/ui'
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

// Emits
const emit = defineEmits<{
  'openSearch': []
  'toggleWordWrap': []
}>()

// Stores
const vaultStore = useVaultStore()
const uiStore = useUIStore()

// Toolbar left position based on sidebar state and mobile view
const toolbarLeft = computed(() => {
  // On mobile, toolbar always spans full width (left: 0)
  if (uiStore.isMobileView) {
    return '0px'
  }
  // On desktop, use sidebar width if visible
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})

// Handle open search event from NoteToolbarActions
const handleOpenSearch = () => {
  emit('openSearch')
}

// Handle word wrap toggle event from NoteToolbarActions
const handleToggleWordWrap = () => {
  emit('toggleWordWrap')
}
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

/* Mobile view: use fixed positioning with touch prevention */
@media (max-width: 768px) {
  .note-toolbar {
    position: fixed;
    touch-action: none;
    pointer-events: auto;
  }

  /* Ensure buttons remain clickable */
  .note-toolbar button,
  .note-toolbar .tabs-dropdown-btn,
  .note-toolbar .tabs-dropdown {
    pointer-events: auto;
  }
}
</style>