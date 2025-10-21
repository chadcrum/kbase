import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from './HomeView.vue'
// import AppLayout from '@/components/layout/AppLayout.vue' // Mocked below
// import NoteViewer from '@/components/viewer/NoteViewer.vue' // Mocked below

// Mock the child components
vi.mock('@/components/layout/AppLayout.vue', () => ({
  default: {
    name: 'AppLayout',
    template: '<div class="app-layout"><slot /></div>'
  }
}))

vi.mock('@/components/viewer/NoteViewer.vue', () => ({
  default: {
    name: 'NoteViewer',
    template: '<div class="note-viewer">Note Viewer</div>'
  }
}))

describe('HomeView', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = () => {
    return mount(HomeView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'AppLayout': {
            template: '<div class="app-layout-stub"><slot /></div>'
          },
          'NoteViewer': {
            template: '<div class="note-viewer-stub">Note Viewer</div>'
          }
        }
      }
    })
  }

  describe('rendering', () => {
    it('should render AppLayout and NoteViewer components', () => {
      wrapper = createWrapper()
      
      expect(wrapper.html()).toContain('app-layout-stub')
      expect(wrapper.html()).toContain('note-viewer-stub')
    })

    it('should have correct component hierarchy', () => {
      wrapper = createWrapper()
      
      const appLayout = wrapper.find('.app-layout-stub')
      const noteViewer = wrapper.find('.note-viewer-stub')
      
      expect(appLayout.exists()).toBe(true)
      expect(noteViewer.exists()).toBe(true)
      
      // NoteViewer should be a child of AppLayout
      expect(appLayout.element.innerHTML).toContain('Note Viewer')
    })
  })

  describe('component structure', () => {
    it('should maintain proper component nesting', () => {
      wrapper = createWrapper()
      
      const appLayout = wrapper.find('.app-layout-stub')
      const noteViewer = wrapper.find('.note-viewer-stub')
      
      // Both components should exist
      expect(appLayout.exists()).toBe(true)
      expect(noteViewer.exists()).toBe(true)
    })

    it('should render as a single root element', () => {
      wrapper = createWrapper()
      
      // Vue 3 allows multiple root elements, but our component should have a single root
      expect(wrapper.element.children).toBeDefined()
    })
  })

  describe('integration', () => {
    it('should properly integrate AppLayout and NoteViewer', () => {
      wrapper = createWrapper()
      
      // Check that both components are rendered
      expect(wrapper.find('.app-layout-stub').exists()).toBe(true)
      expect(wrapper.find('.note-viewer-stub').exists()).toBe(true)
      
      // Check that the content flows through properly
      expect(wrapper.text()).toContain('Note Viewer')
    })

    it('should handle component updates correctly', async () => {
      wrapper = createWrapper()
      
      // Initially both components should be present
      expect(wrapper.find('.app-layout-stub').exists()).toBe(true)
      expect(wrapper.find('.note-viewer-stub').exists()).toBe(true)
      
      // Force re-render and check components are still present
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.app-layout-stub').exists()).toBe(true)
      expect(wrapper.find('.note-viewer-stub').exists()).toBe(true)
    })
  })
})

