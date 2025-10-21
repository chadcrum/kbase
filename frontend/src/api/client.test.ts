import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock axios completely
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }))
  }
}))

// Import after mocking
import { ApiClient } from './client'
import type { LoginRequest, LoginResponse, VerifyResponse } from '@/types'

describe('ApiClient', () => {
  let apiClient: ApiClient

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
    
    // Create new client instance
    apiClient = new ApiClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('should create client with proper configuration', () => {
      expect(apiClient).toBeDefined()
      expect(apiClient.isAuthenticated()).toBe(false)
    })

    it('should handle logout', () => {
      // Set up initial token
      localStorageMock.getItem.mockReturnValue('test-token')
      const newClient = new ApiClient()
      
      newClient.logout()
      
      expect(newClient.isAuthenticated()).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('kbase_token')
    })

    it('should load token from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      
      const newClient = new ApiClient()
      
      expect(newClient.isAuthenticated()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle missing token gracefully', () => {
      // Create a fresh client without any token
      localStorageMock.getItem.mockReturnValue(null)
      const freshClient = new ApiClient()
      expect(freshClient.isAuthenticated()).toBe(false)
    })
  })
})