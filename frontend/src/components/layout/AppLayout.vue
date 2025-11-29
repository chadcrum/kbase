<template>
  <div class="app-layout" :class="{ 'mobile-view': isMobileView }">
    <BackendWarning />
    <Sidebar
      :class="{
        'mobile-hidden': isMobileView && activeMobilePane !== 'sidebar',
        'collapsed': !isMobileView && sidebarCollapsed
      }"
      @open-search="handleOpenSearch"
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
import { computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import Sidebar from '@/components/sidebar/Sidebar.vue'
import BackendWarning from '@/components/common/BackendWarning.vue'
import ResizeHandle from './ResizeHandle.vue'

// Emits
const emit = defineEmits<{
  'open-search': []
}>()

const uiStore = useUIStore()
const { isMobileView } = useResponsive()

const sidebarCollapsed = computed(() => uiStore.sidebarCollapsed)
const activeMobilePane = computed(() => uiStore.activeMobilePane)

// Browser back button support for mobile pane navigation - DISABLED
// This was causing rapid pane switching on mobile browsers
function setupHistoryNavigation() {
  console.log(`[AppLayout] Browser back button support disabled to prevent pane switching issues`)
  // Temporarily disabled until a better implementation can be found
}

/**
 * Handles open search event
 */
const handleOpenSearch = () => {
  emit('open-search')
}

onMounted(() => {
  setupHistoryNavigation()
})
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
    transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
  }

  .mobile-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
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

