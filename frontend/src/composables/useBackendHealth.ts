import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'

export function useBackendHealth() {
  // State
  const isBackendOnline = ref(true)
  const isChecking = ref(false)
  const lastDismissed = ref<number | null>(null)
  const lastFailure = ref<number | null>(null)

  // Computed
  const shouldShowWarning = computed(() => {
    if (isBackendOnline.value) return false
    if (!lastFailure.value) return false
    
    // Don't show if dismissed recently (within 5 seconds)
    if (lastDismissed.value && Date.now() - lastDismissed.value < 5000) {
      return false
    }
    
    return true
  })

  // Actions
  const checkBackendHealth = async (): Promise<boolean> => {
    isChecking.value = true
    
    try {
      // Use a simple health check - try to verify token or make a basic request
      await apiClient.verifyToken()
      isBackendOnline.value = true
      lastFailure.value = null
      return true
    } catch (error: any) {
      // Check if it's a network error (backend down) vs auth error
      const isNetworkError = !error.response || 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout')
      
      if (isNetworkError) {
        isBackendOnline.value = false
        lastFailure.value = Date.now()
        return false
      } else {
        // Auth error - backend is up but token is invalid
        isBackendOnline.value = true
        return true
      }
    } finally {
      isChecking.value = false
    }
  }

  const dismissWarning = () => {
    lastDismissed.value = Date.now()
  }

  const retryConnection = async (): Promise<boolean> => {
    return await checkBackendHealth()
  }

  const markBackendOffline = () => {
    isBackendOnline.value = false
    lastFailure.value = Date.now()
  }

  const markBackendOnline = () => {
    isBackendOnline.value = true
    lastFailure.value = null
  }

  // Setup API client health monitoring
  const handleHealthUpdate = (isOnline: boolean) => {
    if (isOnline) {
      markBackendOnline()
    } else {
      markBackendOffline()
    }
  }

  // Initialize health monitoring
  onMounted(() => {
    apiClient.setHealthCallback(handleHealthUpdate)
    // Do initial health check
    checkBackendHealth()
  })

  // Cleanup
  onUnmounted(() => {
    apiClient.setHealthCallback(() => {})
  })

  return {
    // State
    isBackendOnline,
    isChecking,
    // Computed
    shouldShowWarning,
    // Actions
    checkBackendHealth,
    dismissWarning,
    retryConnection,
    markBackendOffline,
    markBackendOnline
  }
}
