import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupAuthGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()
    
    // Initialize auth state on first navigation
    if (!authStore.isAuthenticated && !authStore.isLoading) {
      await authStore.initializeAuth()
    }

    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !authStore.isAuthenticated) {
      // Redirect to login if route requires auth and user is not authenticated
      next('/login')
    } else if (to.path === '/login' && authStore.isAuthenticated) {
      // Redirect to home if user is authenticated and trying to access login
      next('/')
    } else {
      next()
    }
  })
}

