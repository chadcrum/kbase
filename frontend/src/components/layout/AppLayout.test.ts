import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppLayout from './AppLayout.vue'
import Sidebar from '@/components/sidebar/Sidebar.vue'

// Mock the Sidebar component
vi.mock('@/components/sidebar/Sidebar.vue', () => ({
  default: {
    name: 'Sidebar',
    template: '<div class="sidebar">Sidebar</div>'
  }
}))

describe('AppLayout', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = (slots = {}) => {
    return mount(AppLayout, {
      slots,
      global: {
        plugins: [createPinia()],
        stubs: {
          Sidebar: true
        }
      }
    })
  }

  describe('rendering', () => {
    it('should render layout with sidebar and main content', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.app-layout').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'Sidebar' }).exists()).toBe(true)
      expect(wrapper.find('.main-content').exists()).toBe(true)
    })

    it('should render slot content in main content area', () => {
      const slotContent = '<div class="test-content">Test Content</div>'
      wrapper = createWrapper({
        default: slotContent
      })
      
      expect(wrapper.find('.main-content').html()).toContain('Test Content')
    })

    it('should handle multiple slots', () => {
      const defaultSlot = '<div class="default-slot">Default</div>'
      const headerSlot = '<div class="header-slot">Header</div>'
      
      wrapper = createWrapper({
        default: defaultSlot,
        header: headerSlot
      })
      
      expect(wrapper.find('.main-content').html()).toContain('Default')
      // Note: header slot won't be rendered since we only have default slot in template
    })
  })

  describe('structure', () => {
    it('should have correct CSS classes', () => {
      wrapper = createWrapper()
      
      const appLayout = wrapper.find('.app-layout')
      const mainContent = wrapper.find('.main-content')
      
      expect(appLayout.exists()).toBe(true)
      expect(mainContent.exists()).toBe(true)
    })

    it('should maintain proper layout structure', () => {
      wrapper = createWrapper({
        default: '<div class="content">Content</div>'
      })
      
      // Check that the layout structure is maintained
      const appLayout = wrapper.find('.app-layout')
      const sidebar = wrapper.findComponent({ name: 'Sidebar' })
      const mainContent = wrapper.find('.main-content')
      
      expect(appLayout.element.children).toHaveLength(2)
      expect(sidebar.exists()).toBe(true)
      expect(mainContent.exists()).toBe(true)
    })
  })

  describe('styling', () => {
    it('should have proper layout classes', () => {
      wrapper = createWrapper()
      
      const appLayout = wrapper.find('.app-layout')
      expect(appLayout.classes()).toContain('app-layout')
      
      const mainContent = wrapper.find('.main-content')
      expect(mainContent.classes()).toContain('main-content')
    })
  })

  describe('component integration', () => {
    it('should properly integrate with Sidebar component', () => {
      wrapper = createWrapper()
      
      const sidebar = wrapper.findComponent({ name: 'Sidebar' })
      expect(sidebar.exists()).toBe(true)
    })

    it('should pass through slot content correctly', () => {
      const complexContent = `
        <div class="note-viewer">
          <h1>Test Note</h1>
          <p>This is test content</p>
        </div>
      `
      
      wrapper = createWrapper({
        default: complexContent
      })
      
      expect(wrapper.find('.main-content').html()).toContain('Test Note')
      expect(wrapper.find('.main-content').html()).toContain('This is test content')
    })
  })
})

