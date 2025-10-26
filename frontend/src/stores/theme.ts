import { defineStore } from 'pinia'
import { ref } from 'vue'

const THEME_STORAGE_KEY = 'kbase_theme_mode'

export const useThemeStore = defineStore('theme', () => {
  // State
  const isDarkMode = ref(false)
  let systemPreferenceListener: ((e: MediaQueryListEvent) => void) | null = null

  // Helper to apply theme to document
  const applyTheme = (dark: boolean) => {
    isDarkMode.value = dark
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }

  // Initialize theme from localStorage or system preference
  const initializeTheme = () => {
    // Check if user has a stored preference
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    
    if (storedTheme === 'light' || storedTheme === 'dark') {
      // User has made a choice, use it
      applyTheme(storedTheme === 'dark')
    } else {
      // No user preference, use system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(systemPrefersDark)
    }

    // Listen to system preference changes (only if no user preference set)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPreferenceListener = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      // Only update if user hasn't set a preference
      if (!storedTheme) {
        applyTheme(e.matches)
      }
    }
    mediaQuery.addEventListener('change', systemPreferenceListener)
  }

  // Toggle theme and persist user choice
  const toggleTheme = () => {
    const newTheme = !isDarkMode.value
    applyTheme(newTheme)
    
    // Store user preference
    localStorage.setItem(THEME_STORAGE_KEY, newTheme ? 'dark' : 'light')
  }

  // Set specific theme
  const setTheme = (dark: boolean) => {
    applyTheme(dark)
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light')
  }

  // Cleanup listener
  const cleanup = () => {
    if (systemPreferenceListener) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.removeEventListener('change', systemPreferenceListener)
      systemPreferenceListener = null
    }
  }

  return {
    // State
    isDarkMode,
    // Actions
    initializeTheme,
    toggleTheme,
    setTheme,
    cleanup
  }
})
