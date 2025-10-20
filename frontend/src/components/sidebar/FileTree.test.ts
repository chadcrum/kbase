import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileTree from './FileTree.vue'
import { useVaultStore } from '@/stores/vault'
import type { FileTreeNode } from '@/types'

// Mock the vault store
vi.mock('@/stores/vault', () => ({
  useVaultStore: vi.fn()
}))

describe('FileTree', () => {
  let mockVaultStore: any
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    
    mockVaultStore = {
      isLoading: false,
      hasError: false,
      error: null,
      expandedPaths: new Set(),
      toggleExpanded: vi.fn(),
      selectNote: vi.fn()
    }
    
    vi.mocked(useVaultStore).mockReturnValue(mockVaultStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
    wrapper?.unmount()
  })

  const createWrapper = (props = {}) => {
    return mount(FileTree, {
      props,
      global: {
        plugins: [createPinia()]
      }
    })
  }

  const mockFileTree: FileTreeNode = {
    name: 'root',
    path: '/',
    type: 'directory',
    children: [
      {
        name: 'folder1',
        path: '/folder1',
        type: 'directory',
        children: [
          {
            name: 'note1.md',
            path: '/folder1/note1.md',
            type: 'file'
          }
        ]
      },
      {
        name: 'note2.md',
        path: '/note2.md',
        type: 'file'
      }
    ]
  }

  describe('rendering', () => {
    it('should render file tree when data is available', () => {
      wrapper = createWrapper({ fileTree: mockFileTree })
      
      expect(wrapper.find('.file-tree').exists()).toBe(true)
      // The actual tree structure will be tested in FileTreeNode component
    })

    it('should show loading state', () => {
      mockVaultStore.isLoading = true
      wrapper = createWrapper()
      
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading files...')
    })

    it('should show error state', () => {
      mockVaultStore.hasError = true
      mockVaultStore.error = 'Failed to load files'
      wrapper = createWrapper()
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load files')
      expect(wrapper.find('.retry-button').exists()).toBe(true)
    })

    it('should show empty state when no data', () => {
      wrapper = createWrapper({ fileTree: null })
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No files found')
    })
  })

  describe('events', () => {
    it('should emit refresh event when retry button is clicked', async () => {
      mockVaultStore.hasError = true
      wrapper = createWrapper()
      
      const retryButton = wrapper.find('.retry-button')
      await retryButton.trigger('click')
      
      expect(wrapper.emitted('refresh')).toBeTruthy()
    })

    it('should handle toggle expand events from child components', async () => {
      wrapper = createWrapper({ fileTree: mockFileTree })
      
      // Simulate toggle expand event from child
      wrapper.vm.handleToggleExpand('/folder1')
      
      expect(mockVaultStore.toggleExpanded).toHaveBeenCalledWith('/folder1')
    })

    it('should handle select note events from child components', async () => {
      wrapper = createWrapper({ fileTree: mockFileTree })
      
      // Simulate select note event from child
      wrapper.vm.handleSelectNote('/note2.md')
      
      expect(mockVaultStore.selectNote).toHaveBeenCalledWith('/note2.md')
    })
  })
})

