<template>
  <div class="app-layout">
    <BackendWarning />
    <Sidebar :class="{ 'collapsed': vaultStore.isSidebarCollapsed }" />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useVaultStore } from '@/stores/vault'
import Sidebar from '@/components/sidebar/Sidebar.vue'
import BackendWarning from '@/components/common/BackendWarning.vue'

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

/* Responsive design */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  
  .main-content {
    height: calc(100vh - 200px); /* Adjust based on sidebar height */
  }
}
</style>

