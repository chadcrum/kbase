import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'
import type { GitStatus } from '@/types'

export function useGitStatus() {
  // State
  const gitStatus = ref<GitStatus | null>(null)
  const isChecking = ref(false)
  const lastDismissed = ref<number | null>(null)
  let checkInterval: number | null = null

  // Computed
  const hasError = computed(() => {
    return gitStatus.value?.last_error !== null && gitStatus.value?.last_error !== undefined
  })

  const shouldShowWarning = computed(() => {
    if (!hasError.value) return false
    if (!gitStatus.value?.last_error_time) return false
    
    // Don't show if dismissed recently (within 5 seconds)
    if (lastDismissed.value && Date.now() - lastDismissed.value < 5000) {
      return false
    }
    
    return true
  })

  const lastCommitTime = computed(() => {
    if (!gitStatus.value?.last_commit) return null
    return new Date(gitStatus.value.last_commit * 1000)
  })

  const lastErrorTime = computed(() => {
    if (!gitStatus.value?.last_error_time) return null
    return new Date(gitStatus.value.last_error_time * 1000)
  })

  // Actions
  const checkGitStatus = async (): Promise<void> => {
    isChecking.value = true
    
    try {
      const health = await apiClient.getHealth()
      gitStatus.value = health.git_status
    } catch (error: any) {
      // Silently fail - don't show errors for health check failures
      console.warn('Failed to fetch git status:', error)
    } finally {
      isChecking.value = false
    }
  }

  const dismissWarning = () => {
    lastDismissed.value = Date.now()
  }

  // Initialize
  onMounted(() => {
    // Initial check
    checkGitStatus()
    
    // Check every 30 seconds
    checkInterval = window.setInterval(() => {
      checkGitStatus()
    }, 30000)
  })

  // Cleanup
  onUnmounted(() => {
    if (checkInterval !== null) {
      clearInterval(checkInterval)
    }
  })

  return {
    // State
    gitStatus,
    isChecking,
    // Computed
    hasError,
    shouldShowWarning,
    lastCommitTime,
    lastErrorTime,
    // Actions
    checkGitStatus,
    dismissWarning
  }
}

