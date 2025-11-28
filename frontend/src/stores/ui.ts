import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MobilePane = 'sidebar' | 'editor'

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarCollapsed = ref(false)
  const activeMobilePane = ref<MobilePane>('sidebar') // Default to sidebar on mobile
  const isMobileView = ref(false)

  // Getters
  const isSidebarCollapsed = computed(() => sidebarCollapsed.value)

  // Actions
  // Toggle between sidebar and editor on mobile
  function toggleMobilePane() {
    if (isMobileView.value) {
      activeMobilePane.value =
        activeMobilePane.value === 'sidebar' ? 'editor' : 'sidebar'
    }
  }

  // Update mobile view detection
  function updateMobileView(isMobile: boolean) {
    isMobileView.value = isMobile
    // Reset to sidebar when transitioning to mobile
    if (isMobile && activeMobilePane.value === 'editor') {
      activeMobilePane.value = 'sidebar'
    }
  }

  // Toggle for desktop behavior or mobile pane switching
  function toggleSidebar() {
    if (isMobileView.value) {
      // On mobile, toggle between panes
      toggleMobilePane()
    } else {
      // On desktop, collapse/expand sidebar
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
  }

  return {
    // State
    sidebarCollapsed,
    activeMobilePane,
    isMobileView,
    // Getters
    isSidebarCollapsed,
    // Actions
    toggleMobilePane,
    updateMobileView,
    toggleSidebar
  }
})