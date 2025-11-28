import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'

export const MOBILE_BREAKPOINT = 768 // px

export function useResponsive() {
  const uiStore = useUIStore()
  const windowWidth = ref(window.innerWidth)

  const checkMobileView = () => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT
    uiStore.updateMobileView(isMobile)
    windowWidth.value = window.innerWidth
  }

  const handleResize = () => {
    checkMobileView()
  }

  onMounted(() => {
    checkMobileView()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    isMobileView: computed(() => uiStore.isMobileView),
    windowWidth,
  }
}