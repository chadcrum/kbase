<template>
  <div class="app-layout">
    <BackendWarning />
    <Sidebar :class="{ 'collapsed': vaultStore.isSidebarCollapsed }" />
    <ResizeHandle v-if="!vaultStore.isSidebarCollapsed" />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useVaultStore } from '@/stores/vault'
import Sidebar from '@/components/sidebar/Sidebar.vue'
import BackendWarning from '@/components/common/BackendWarning.vue'
import ResizeHandle from './ResizeHandle.vue'

const vaultStore = useVaultStore()
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background-color: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-secondary);
  transition: background-color 0.3s ease;
}

/* Responsive design - maintain side-by-side on mobile */
@media (max-width: 768px) {
  .app-layout {
    /* Keep flex row layout for side-by-side panes */
  }
  
  .main-content {
    /* Natural flex sizing alongside sidebar */
  }
}

/* Touch-friendly targets */
@media (hover: none) and (pointer: coarse) {
  button,
  .clickable {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>

