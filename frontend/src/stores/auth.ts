import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import type { LoginRequest } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasError = computed(() => error.value !== null)

  // Actions
  const login = async (credentials: LoginRequest): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      await apiClient.login(credentials)
      isAuthenticated.value = true
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Login failed'
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    apiClient.logout()
    isAuthenticated.value = false
    error.value = null
  }

  const verifyToken = async (): Promise<boolean> => {
    if (!apiClient.isAuthenticated()) {
      isAuthenticated.value = false
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await apiClient.verifyToken()
      isAuthenticated.value = true
      return true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Token verification failed'
      isAuthenticated.value = false
      logout() // Clear invalid token
      return false
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const initializeAuth = async (): Promise<boolean> => {
    return await verifyToken()
  }

  return {
    // State
    isAuthenticated,
    isLoading,
    error,
    // Getters
    hasError,
    // Actions
    login,
    logout,
    verifyToken,
    clearError,
    initializeAuth
  }
})

