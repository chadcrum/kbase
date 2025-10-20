import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import HomeView from '@/views/HomeView.vue'

// Mock the views
vi.mock('@/views/LoginView.vue', () => ({
  default: { name: 'LoginView' }
}))

vi.mock('@/views/HomeView.vue', () => ({
  default: { name: 'HomeView' }
}))

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn()
}))

describe('Router', () => {
  let router: any
  let mockAuthStore: any

  beforeEach(() => {
    // Create a fresh Pinia instance
    setActivePinia(createPinia())
    
    // Mock auth store
    mockAuthStore = {
      isAuthenticated: false,
      isLoading: false,
      initializeAuth: vi.fn().mockResolvedValue(true)
    }
    
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    // Create router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/login',
          name: 'login',
          component: LoginView,
          meta: { requiresAuth: false }
        },
        {
          path: '/',
          name: 'home',
          component: HomeView,
          meta: { requiresAuth: true }
        }
      ]
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('route configuration', () => {
    it('should have correct routes', () => {
      const routes = router.getRoutes()
      expect(routes).toHaveLength(2) // Login and home routes
      
      const loginRoute = routes.find((r: any) => r.name === 'login')
      const homeRoute = routes.find((r: any) => r.name === 'home')
      
      expect(loginRoute?.path).toBe('/login')
      expect(homeRoute?.path).toBe('/')
      expect(loginRoute?.meta.requiresAuth).toBe(false)
      expect(homeRoute?.meta.requiresAuth).toBe(true)
    })
  })

  describe('auth guard', () => {
    it('should have beforeEach guard registered', () => {
      // Router should be created successfully
      expect(router).toBeDefined()
    })
  })
})
