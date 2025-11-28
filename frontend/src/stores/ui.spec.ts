import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from './ui'

describe('UI Store - Mobile Pane Toggle', () => {
  let uiStore: ReturnType<typeof useUIStore>

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    uiStore = useUIStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(uiStore.sidebarCollapsed).toBe(false)
      expect(uiStore.activeMobilePane).toBe('sidebar')
      expect(uiStore.isMobileView).toBe(false)
      expect(uiStore.isSidebarCollapsed).toBe(false)
    })
  })

  describe('toggleMobilePane', () => {
    it('should toggle mobile pane between sidebar and editor', () => {
      uiStore.isMobileView = true
      uiStore.activeMobilePane = 'sidebar'

      uiStore.toggleMobilePane()
      expect(uiStore.activeMobilePane).toBe('editor')

      uiStore.toggleMobilePane()
      expect(uiStore.activeMobilePane).toBe('sidebar')
    })

    it('should not affect activeMobilePane when not in mobile view', () => {
      uiStore.isMobileView = false
      uiStore.activeMobilePane = 'sidebar'

      uiStore.toggleMobilePane()
      expect(uiStore.activeMobilePane).toBe('sidebar')
    })
  })

  describe('updateMobileView', () => {
    it('should update mobile view state', () => {
      uiStore.updateMobileView(true)
      expect(uiStore.isMobileView).toBe(true)

      uiStore.updateMobileView(false)
      expect(uiStore.isMobileView).toBe(false)
    })

    it('should reset to sidebar when transitioning from desktop to mobile', () => {
      // Start in desktop mode
      uiStore.isMobileView = false
      uiStore.activeMobilePane = 'editor'

      // Transition to mobile
      uiStore.updateMobileView(true)
      expect(uiStore.activeMobilePane).toBe('sidebar')
    })

    it('should NOT reset when already in mobile view (resize events)', () => {
      // Start in mobile mode with editor pane active
      uiStore.isMobileView = true
      uiStore.activeMobilePane = 'editor'

      // Resize event triggers update but should not reset pane
      uiStore.updateMobileView(true)
      expect(uiStore.activeMobilePane).toBe('editor')
    })

    it('should not reset activeMobilePane when transitioning from mobile to desktop', () => {
      uiStore.isMobileView = true
      uiStore.activeMobilePane = 'editor'

      uiStore.updateMobileView(false)
      expect(uiStore.activeMobilePane).toBe('editor')
    })
  })

  describe('toggleSidebar', () => {
    it('should toggle between panes on mobile', () => {
      uiStore.isMobileView = true
      uiStore.activeMobilePane = 'sidebar'

      uiStore.toggleSidebar()
      expect(uiStore.activeMobilePane).toBe('editor')

      uiStore.toggleSidebar()
      expect(uiStore.activeMobilePane).toBe('sidebar')
    })

    it('should collapse/expand sidebar on desktop', () => {
      uiStore.isMobileView = false
      uiStore.sidebarCollapsed = false

      uiStore.toggleSidebar()
      expect(uiStore.sidebarCollapsed).toBe(true)

      uiStore.toggleSidebar()
      expect(uiStore.sidebarCollapsed).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should compute isSidebarCollapsed correctly', () => {
      uiStore.sidebarCollapsed = false
      expect(uiStore.isSidebarCollapsed).toBe(false)

      uiStore.sidebarCollapsed = true
      expect(uiStore.isSidebarCollapsed).toBe(true)
    })
  })
})