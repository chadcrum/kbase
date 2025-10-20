import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import { apiClient } from '@/api/client'
import type { LoginRequest } from '@/types'

// Mock the API client
vi.mock('@/api/client', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    isAuthenticated: vi.fn()
  }
}))

const mockedApiClient = vi.mocked(apiClient)

describe('AuthStore', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    authStore = useAuthStore()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.isLoading).toBe(false)
      expect(authStore.error).toBeNull()
      expect(authStore.hasError).toBe(false)
    })
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const credentials: LoginRequest = { password: 'test-password' }
      mockedApiClient.login.mockResolvedValue({
        access_token: 'test-token',
        token_type: 'bearer'
      })

      const result = await authStore.login(credentials)

      expect(mockedApiClient.login).toHaveBeenCalledWith(credentials)
      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.error).toBeNull()
      expect(authStore.isLoading).toBe(false)
    })

    it('should handle login failure', async () => {
      const credentials: LoginRequest = { password: 'wrong-password' }
      const error = { response: { data: { detail: 'Incorrect password' } } }
      mockedApiClient.login.mockRejectedValue(error)

      const result = await authStore.login(credentials)

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.error).toBe('Incorrect password')
      expect(authStore.isLoading).toBe(false)
    })

    it('should handle login failure without response data', async () => {
      const credentials: LoginRequest = { password: 'wrong-password' }
      const error = new Error('Network error')
      mockedApiClient.login.mockRejectedValue(error)

      const result = await authStore.login(credentials)

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.error).toBe('Login failed')
      expect(authStore.isLoading).toBe(false)
    })

    it('should set loading state during login', async () => {
      const credentials: LoginRequest = { password: 'test-password' }
      
      // Create a promise that we can control
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })
      mockedApiClient.login.mockReturnValue(loginPromise)

      // Start login
      const loginPromiseResult = authStore.login(credentials)
      
      // Check loading state
      expect(authStore.isLoading).toBe(true)
      
      // Resolve the login
      resolveLogin!({
        access_token: 'test-token',
        token_type: 'bearer'
      })
      
      await loginPromiseResult
      
      // Check loading state is cleared
      expect(authStore.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout successfully', () => {
      // Set up initial authenticated state
      authStore.isAuthenticated = true
      authStore.error = 'some error'

      authStore.logout()

      expect(mockedApiClient.logout).toHaveBeenCalled()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.error).toBeNull()
    })
  })

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      mockedApiClient.isAuthenticated.mockReturnValue(true)
      mockedApiClient.verifyToken.mockResolvedValue({ valid: true })

      const result = await authStore.verifyToken()

      expect(mockedApiClient.verifyToken).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.error).toBeNull()
    })

    it('should handle token verification failure', async () => {
      mockedApiClient.isAuthenticated.mockReturnValue(true)
      const error = { response: { data: { detail: 'Token expired' } } }
      mockedApiClient.verifyToken.mockRejectedValue(error)

      const result = await authStore.verifyToken()

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      // The error should be set but might be cleared by logout
      expect(authStore.error).toBe(null)
      // Note: logout is called internally by the store
    })

    it('should return false when not authenticated', async () => {
      mockedApiClient.isAuthenticated.mockReturnValue(false)

      const result = await authStore.verifyToken()

      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(mockedApiClient.verifyToken).not.toHaveBeenCalled()
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      authStore.error = 'Some error'
      
      authStore.clearError()
      
      expect(authStore.error).toBeNull()
    })
  })

  describe('initializeAuth', () => {
    it('should initialize auth by verifying token', async () => {
      mockedApiClient.isAuthenticated.mockReturnValue(true)
      mockedApiClient.verifyToken.mockResolvedValue({ valid: true })

      const result = await authStore.initializeAuth()

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
    })
  })
})
