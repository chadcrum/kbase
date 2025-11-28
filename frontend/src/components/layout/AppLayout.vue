<template>
  <div class="app-layout" :class="{ 'mobile-view': isMobileView }">
    <BackendWarning />
    <Sidebar
      :class="{
        'mobile-hidden': isMobileView && activeMobilePane !== 'sidebar',
        'collapsed': !isMobileView && sidebarCollapsed
      }"
    />
    <ResizeHandle v-if="!isMobileView && !sidebarCollapsed" />
    <main
      class="main-content"
      :class="{
        'mobile-hidden': isMobileView && activeMobilePane !== 'editor',
        'expanded': !isMobileView && sidebarCollapsed
      }"
    >
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import Sidebar from '@/components/sidebar/Sidebar.vue'
import BackendWarning from '@/components/common/BackendWarning.vue'
import ResizeHandle from './ResizeHandle.vue'

const uiStore = useUIStore()
const { isMobileView } = useResponsive()

const sidebarCollapsed = computed(() => uiStore.sidebarCollapsed)
const activeMobilePane = computed(() => uiStore.activeMobilePane)
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
  transition: all 0.3s ease;
}

.expanded {
  flex: 1;
}

/* Mobile-specific styles */
.mobile-view {
  .main-content,
  .sidebar {
    flex: 0 0 100%;
    width: 100%;
    transition: transform 0.3s ease;
  }

  .mobile-hidden {
    display: none;
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

