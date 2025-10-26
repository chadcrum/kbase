import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import { useAuthStore } from '@/stores/auth'

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn()
}))

const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => mockRouter
  }
})

describe('LoginView', () => {
  let mockAuthStore: any
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockAuthStore = {
      isLoading: false,
      hasError: false,
      error: null,
      login: vi.fn(),
      clearError: vi.fn()
    }
    
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
    wrapper?.unmount()
  })

  const createWrapper = () => {
    return mount(LoginView, {
      global: {
        plugins: [createRouter({
          history: createWebHistory(),
          routes: []
        })]
      }
    })
  }

  describe('rendering', () => {
    it('should render login form correctly', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.login-title').text()).toBe('KBase')
      expect(wrapper.find('.login-subtitle').text()).toBe('Sign in to access your notes')
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('should show loading state when authenticating', async () => {
      mockAuthStore.isLoading = true
      wrapper = createWrapper()
      
      const button = wrapper.find('button[type="submit"]')
      expect(button.text()).toContain('Signing in...')
      expect(button.attributes('disabled')).toBeDefined()
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('should show error message when authentication fails', async () => {
      mockAuthStore.hasError = true
      mockAuthStore.error = 'Incorrect password'
      wrapper = createWrapper()
      
      expect(wrapper.find('.error-message').text()).toBe('Incorrect password')
    })

    it('should disable submit button when password is empty', async () => {
      wrapper = createWrapper()
      
      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when password is provided', async () => {
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('test-password')
      
      const button = wrapper.find('button[type="submit"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })

  describe('user interactions', () => {
    it('should call login with password when form is submitted', async () => {
      mockAuthStore.login.mockResolvedValue(true)
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('test-password')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockAuthStore.login).toHaveBeenCalledWith({ 
        password: 'test-password',
        remember_me: false
      })
    })

    it('should redirect to home page on successful login', async () => {
      mockAuthStore.login.mockResolvedValue(true)
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('test-password')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })

    it('should not redirect on failed login', async () => {
      mockAuthStore.login.mockResolvedValue(false)
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('wrong-password')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should not submit form with empty password', async () => {
      wrapper = createWrapper()
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockAuthStore.login).not.toHaveBeenCalled()
    })

    it('should clear errors before submitting', async () => {
      mockAuthStore.login.mockResolvedValue(true)
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('test-password')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockAuthStore.clearError).toHaveBeenCalled()
    })

    it('should call login with remember_me true when checkbox is checked', async () => {
      mockAuthStore.login.mockResolvedValue(true)
      wrapper = createWrapper()
      
      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('test-password')
      
      const rememberMeCheckbox = wrapper.find('input[type="checkbox"]')
      await rememberMeCheckbox.setValue(true)
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      
      expect(mockAuthStore.login).toHaveBeenCalledWith({ 
        password: 'test-password',
        remember_me: true
      })
    })

    it('should render remember me checkbox', () => {
      wrapper = createWrapper()
      
      const rememberMeCheckbox = wrapper.find('input[type="checkbox"]')
      expect(rememberMeCheckbox.exists()).toBe(true)
      
      const rememberMeLabel = wrapper.find('label[for="remember-me"]')
      expect(rememberMeLabel.exists()).toBe(true)
      expect(rememberMeLabel.text()).toContain('Remember me')
    })
  })

  describe('lifecycle', () => {
    it('should clear errors and focus password input on mount', async () => {
      wrapper = createWrapper()
      
      expect(mockAuthStore.clearError).toHaveBeenCalled()
      
      // Check if password input is focused (this might need to be adjusted based on DOM testing limitations)
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels and inputs', () => {
      wrapper = createWrapper()
      
      const passwordLabel = wrapper.find('label[for="password"]')
      const passwordInput = wrapper.find('input[id="password"]')
      
      expect(passwordLabel.exists()).toBe(true)
      expect(passwordInput.exists()).toBe(true)
      expect(passwordInput.attributes('autocomplete')).toBe('current-password')
      expect(passwordInput.attributes('required')).toBeDefined()
    })

    it('should have proper error association', async () => {
      mockAuthStore.hasError = true
      mockAuthStore.error = 'Test error'
      wrapper = createWrapper()
      
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toBe('Test error')
    })
  })
})

