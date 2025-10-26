import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/'
    }
  ]
})

// Track if auth has been initialized
let authInitialized = false

// Auth guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth state once on first navigation
  if (!authInitialized) {
    authInitialized = true
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

export default router

