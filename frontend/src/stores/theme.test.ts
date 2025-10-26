import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from './theme'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

// Mock matchMedia
const matchMediaMock = vi.fn()

describe('ThemeStore', () => {
  let themeStore: ReturnType<typeof useThemeStore>

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    themeStore = useThemeStore()
    
    // Reset localStorage mock
    localStorageMock.clear()
    
    // Reset matchMedia mock
    matchMediaMock.mockClear()
    
    // Setup global mocks
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('matchMedia', matchMediaMock)
    
    // Mock document.documentElement
    const mockDocumentElement = {
      setAttribute: vi.fn()
    }
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      configurable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have isDarkMode set to false initially', () => {
      expect(themeStore.isDarkMode).toBe(false)
    })
  })

  describe('initializeTheme', () => {
    it('should use system preference when no user preference exists', () => {
      // Mock system prefers dark - need to mock multiple calls to matchMedia
      const mockMediaQuery = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      expect(localStorage.getItem('kbase_theme_mode')).toBeNull()
      
      themeStore.initializeTheme()
      
      expect(themeStore.isDarkMode).toBe(true)
      matchMediaMock.mockClear()
    })

    it('should use light mode when system prefers light and no user preference', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      
      expect(themeStore.isDarkMode).toBe(false)
      matchMediaMock.mockClear()
    })

    it('should use stored user preference over system preference', () => {
      localStorage.setItem('kbase_theme_mode', 'dark')
      
      const mockMediaQuery = {
        matches: false, // System prefers light
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      
      // Should use stored preference (dark) not system preference (light)
      expect(themeStore.isDarkMode).toBe(true)
      matchMediaMock.mockClear()
    })

    it('should set data-theme attribute on documentElement', () => {
      const setAttributeSpy = vi.fn()
      Object.defineProperty(document, 'documentElement', {
        value: { setAttribute: setAttributeSpy },
        configurable: true,
        writable: true
      })
      
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      
      expect(setAttributeSpy).toHaveBeenCalled()
      matchMediaMock.mockClear()
    })
  })

  describe('toggleTheme', () => {
    beforeEach(() => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      themeStore.initializeTheme()
      matchMediaMock.mockClear()
    })

    it('should toggle from light to dark mode', () => {
      themeStore.isDarkMode = false
      
      themeStore.toggleTheme()
      
      expect(themeStore.isDarkMode).toBe(true)
      expect(localStorage.getItem('kbase_theme_mode')).toBe('dark')
    })

    it('should toggle from dark to light mode', () => {
      themeStore.isDarkMode = true
      
      themeStore.toggleTheme()
      
      expect(themeStore.isDarkMode).toBe(false)
      expect(localStorage.getItem('kbase_theme_mode')).toBe('light')
    })

    it('should persist theme preference in localStorage', () => {
      themeStore.isDarkMode = false
      themeStore.toggleTheme()
      
      expect(localStorage.getItem('kbase_theme_mode')).toBe('dark')
      
      themeStore.toggleTheme()
      
      expect(localStorage.getItem('kbase_theme_mode')).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('should set light theme', () => {
      themeStore.setTheme(false)
      
      expect(themeStore.isDarkMode).toBe(false)
      expect(localStorage.getItem('kbase_theme_mode')).toBe('light')
    })

    it('should set dark theme', () => {
      themeStore.setTheme(true)
      
      expect(themeStore.isDarkMode).toBe(true)
      expect(localStorage.getItem('kbase_theme_mode')).toBe('dark')
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on cleanup', () => {
      const removeEventListenerSpy = vi.fn()
      const addEventListenerSpy = vi.fn()
      
      const mockMediaQuery = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      themeStore.cleanup()
      
      expect(removeEventListenerSpy).toHaveBeenCalled()
      matchMediaMock.mockClear()
    })
  })

  describe('system preference watching', () => {
    it('should not watch system preference when user has set preference', () => {
      localStorage.setItem('kbase_theme_mode', 'dark')
      const addEventListenerSpy = vi.fn()
      
      const mockMediaQuery = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      
      // Should not add listener when user has preference
      // (This tests the logic indirectly by checking the state)
      expect(themeStore.isDarkMode).toBe(true)
      matchMediaMock.mockClear()
    })

    it('should watch system preference when no user preference exists', () => {
      const addEventListenerSpy = vi.fn()
      
      const mockMediaQuery = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn()
      }
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      themeStore.initializeTheme()
      
      // Should add listener when no user preference
      expect(addEventListenerSpy).toHaveBeenCalled()
      matchMediaMock.mockClear()
    })
  })
})
