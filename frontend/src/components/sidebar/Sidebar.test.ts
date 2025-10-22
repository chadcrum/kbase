import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Sidebar from './Sidebar.vue'
import { useVaultStore } from '@/stores/vault'
import type { FileTreeNode } from '@/types'

// Mock the vault store
vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

describe('Sidebar', () => {
  let mockVaultStore: any
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockVaultStore = {
      fileTree: null,
      isLoading: false,
      loadFileTree: vi.fn(),
      refresh: vi.fn(),
      expandedPaths: new Set()
    }
    
    vi.mocked(useVaultStore).mockReturnValue(mockVaultStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
    wrapper?.unmount()
  })

  const createWrapper = () => {
    return mount(Sidebar, {
      global: {
        plugins: [createPinia()]
      }
    })
  }

  describe('rendering', () => {
    it('should render sidebar with correct structure', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.sidebar').exists()).toBe(true)
      expect(wrapper.find('.sidebar-content').exists()).toBe(true)
    })

    it('should render FileTree component', () => {
      wrapper = createWrapper()
      
      expect(wrapper.findComponent({ name: 'FileTree' }).exists()).toBe(true)
    })

    it('should render FileExplorerToolbar component', () => {
      wrapper = createWrapper()
      
      expect(wrapper.findComponent({ name: 'FileExplorerToolbar' }).exists()).toBe(true)
    })
  })

  describe('refresh functionality', () => {
    it('should pass refresh event from FileExplorerToolbar to vault store', async () => {
      wrapper = createWrapper()
      
      // Simulate refresh event from FileExplorerToolbar
      const toolbar = wrapper.findComponent({ name: 'FileExplorerToolbar' })
      await toolbar.vm.$emit('refresh')
      
      expect(mockVaultStore.refresh).toHaveBeenCalled()
    })

    it('should pass isLoading prop to FileExplorerToolbar', () => {
      mockVaultStore.isLoading = true
      wrapper = createWrapper()
      
      const toolbar = wrapper.findComponent({ name: 'FileExplorerToolbar' })
      expect(toolbar.props('isLoading')).toBe(true)
    })

    it('should pass refresh event from FileTree to vault store', async () => {
      wrapper = createWrapper()
      
      // Simulate refresh event from FileTree
      const fileTree = wrapper.findComponent({ name: 'FileTree' })
      await fileTree.vm.$emit('refresh')
      
      expect(mockVaultStore.refresh).toHaveBeenCalled()
    })
  })

  describe('lifecycle', () => {
    it('should load file tree on mount when no data exists', () => {
      mockVaultStore.fileTree = null
      wrapper = createWrapper()
      
      expect(mockVaultStore.loadFileTree).toHaveBeenCalled()
    })

    it('should not load file tree on mount when data already exists', () => {
      const mockFileTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }
      mockVaultStore.fileTree = mockFileTree
      wrapper = createWrapper()
      
      expect(mockVaultStore.loadFileTree).not.toHaveBeenCalled()
    })
  })

  describe('props passing', () => {
    it('should pass fileTree prop to FileTree component', () => {
      const mockFileTree: FileTreeNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        children: []
      }
      mockVaultStore.fileTree = mockFileTree
      wrapper = createWrapper()
      
      const fileTree = wrapper.findComponent({ name: 'FileTree' })
      expect(fileTree.props('fileTree')).toEqual(mockFileTree)
    })
  })

  describe('styling', () => {
    it('should have correct sidebar dimensions', () => {
      wrapper = createWrapper()
      
      const sidebar = wrapper.find('.sidebar')
      expect(sidebar.classes()).toContain('sidebar')
    })
  })
})

