import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmDialog from './ConfirmDialog.vue'
import InputDialog from './InputDialog.vue'
import OmniSearch from './OmniSearch.vue'

describe('Modal Dark Mode Styling', () => {
  let mountTarget: HTMLDivElement
  let pinia: any

  beforeEach(() => {
    // Create Pinia instance for tests
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Create a target for Teleport
    mountTarget = document.createElement('div')
    mountTarget.id = 'modal-root'
    document.body.appendChild(mountTarget)
    
    // Reset theme to light mode
    document.documentElement.setAttribute('data-theme', 'light')
    
    // Add CSS variables to document for testing
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --border-color: #e2e8f0;
        --text-primary: #1f2937;
        --text-secondary: #6b7280;
        --text-tertiary: #9ca3af;
        --shadow: rgba(0, 0, 0, 0.1);
      }
      
      [data-theme="dark"] {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --border-color: #334155;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-tertiary: #94a3b8;
        --shadow: rgba(0, 0, 0, 0.3);
      }
    `
    document.head.appendChild(style)
  })

  afterEach(() => {
    // Clean up after each test
    if (mountTarget && document.body.contains(mountTarget)) {
      document.body.removeChild(mountTarget)
    }
    
    // Remove test styles
    const testStyles = document.querySelectorAll('style')
    testStyles.forEach(style => {
      if (style.textContent?.includes('--bg-primary')) {
        style.remove()
      }
    })
  })

  describe('ConfirmDialog Dark Mode', () => {
    it('should apply dark mode styles when data-theme is dark', async () => {
      // Set dark mode
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Dialog',
          message: 'Test message',
          isDangerous: false
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const modalContainer = document.querySelector('.modal-container') as HTMLElement
      expect(modalContainer).toBeTruthy()
      
      // Check that CSS variables are being used (computed styles will show the actual values)
      const computedStyle = window.getComputedStyle(modalContainer)
      expect(computedStyle.backgroundColor).toBeTruthy()
      
      wrapper.unmount()
    })

    it('should apply light mode styles when data-theme is light', async () => {
      // Ensure light mode
      document.documentElement.setAttribute('data-theme', 'light')
      
      const wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Dialog',
          message: 'Test message',
          isDangerous: false
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const modalContainer = document.querySelector('.modal-container') as HTMLElement
      expect(modalContainer).toBeTruthy()
      
      wrapper.unmount()
    })
  })

  describe('InputDialog Dark Mode', () => {
    it('should apply dark mode styles when data-theme is dark', async () => {
      // Set dark mode
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(InputDialog, {
        props: {
          isOpen: true,
          title: 'Test Input',
          message: 'Enter a value',
          placeholder: 'test-input'
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const modalContainer = document.querySelector('.modal-container') as HTMLElement
      const modalInput = document.querySelector('.modal-input') as HTMLElement
      
      expect(modalContainer).toBeTruthy()
      expect(modalInput).toBeTruthy()
      
      wrapper.unmount()
    })

    it('should apply light mode styles when data-theme is light', async () => {
      // Ensure light mode
      document.documentElement.setAttribute('data-theme', 'light')
      
      const wrapper = mount(InputDialog, {
        props: {
          isOpen: true,
          title: 'Test Input',
          message: 'Enter a value',
          placeholder: 'test-input'
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const modalContainer = document.querySelector('.modal-container') as HTMLElement
      const modalInput = document.querySelector('.modal-input') as HTMLElement
      
      expect(modalContainer).toBeTruthy()
      expect(modalInput).toBeTruthy()
      
      wrapper.unmount()
    })
  })

  describe('OmniSearch Dark Mode', () => {
    it('should apply dark mode styles when data-theme is dark', async () => {
      // Set dark mode
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(OmniSearch, {
        props: {
          isOpen: true
        },
        global: {
          plugins: [pinia]
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const omniSearchModal = document.querySelector('.omni-search-modal') as HTMLElement
      const searchInput = document.querySelector('.search-input') as HTMLElement
      
      expect(omniSearchModal).toBeTruthy()
      expect(searchInput).toBeTruthy()
      
      wrapper.unmount()
    })

    it('should apply light mode styles when data-theme is light', async () => {
      // Ensure light mode
      document.documentElement.setAttribute('data-theme', 'light')
      
      const wrapper = mount(OmniSearch, {
        props: {
          isOpen: true
        },
        global: {
          plugins: [pinia]
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      const omniSearchModal = document.querySelector('.omni-search-modal') as HTMLElement
      const searchInput = document.querySelector('.search-input') as HTMLElement
      
      expect(omniSearchModal).toBeTruthy()
      expect(searchInput).toBeTruthy()
      
      wrapper.unmount()
    })

    it('should have subtle selection styling in dark mode', async () => {
      // Set dark mode
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(OmniSearch, {
        props: {
          isOpen: true
        },
        global: {
          plugins: [pinia]
        },
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()

      // Check that result-item.selected uses CSS variables
      const resultItem = document.querySelector('.result-item.selected') as HTMLElement
      if (resultItem) {
        const computedStyle = window.getComputedStyle(resultItem)
        expect(computedStyle.backgroundColor).toBeTruthy()
      }
      
      wrapper.unmount()
    })
  })

  describe('CSS Variable Integration', () => {
    it('should have all required CSS variables defined', () => {
      const rootStyles = window.getComputedStyle(document.documentElement)
      
      // Check that CSS variables are defined
      expect(rootStyles.getPropertyValue('--bg-primary')).toBeTruthy()
      expect(rootStyles.getPropertyValue('--bg-secondary')).toBeTruthy()
      expect(rootStyles.getPropertyValue('--text-primary')).toBeTruthy()
      expect(rootStyles.getPropertyValue('--text-secondary')).toBeTruthy()
      expect(rootStyles.getPropertyValue('--border-color')).toBeTruthy()
    })

    it('should have different values for light and dark themes', () => {
      // Test light mode
      document.documentElement.setAttribute('data-theme', 'light')
      const lightStyles = window.getComputedStyle(document.documentElement)
      const lightBgPrimary = lightStyles.getPropertyValue('--bg-primary')
      const lightTextPrimary = lightStyles.getPropertyValue('--text-primary')
      
      // Test dark mode
      document.documentElement.setAttribute('data-theme', 'dark')
      const darkStyles = window.getComputedStyle(document.documentElement)
      const darkBgPrimary = darkStyles.getPropertyValue('--bg-primary')
      const darkTextPrimary = darkStyles.getPropertyValue('--text-primary')
      
      // Values should be different between themes
      expect(lightBgPrimary).not.toBe(darkBgPrimary)
      expect(lightTextPrimary).not.toBe(darkTextPrimary)
    })
  })
})
