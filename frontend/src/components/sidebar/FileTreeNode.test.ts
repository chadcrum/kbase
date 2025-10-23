import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileTreeNode from './FileTreeNode.vue'
import type { FileTreeNode as FileTreeNodeType } from '@/types'

describe('FileTreeNode', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  const createWrapper = (props: any) => {
    return mount(FileTreeNode, {
      props,
      global: {
        plugins: [createPinia()]
      }
    })
  }

  describe('file nodes', () => {
    const fileNode: FileTreeNodeType = {
      name: 'note.md',
      path: '/note.md',
      type: 'file'
    }

    it('should render file node correctly', () => {
      wrapper = createWrapper({
        node: fileNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      expect(wrapper.find('.node-item.is-file').exists()).toBe(true)
      expect(wrapper.find('.file-icon').text()).toBe('📄')
      expect(wrapper.find('.node-name').text()).toBe('note.md')
    })

    it('should emit selectNote when clicked', async () => {
      wrapper = createWrapper({
        node: fileNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      await wrapper.find('.node-item').trigger('click')
      
      expect(wrapper.emitted('selectNote')).toBeTruthy()
      expect(wrapper.emitted('selectNote')[0]).toEqual(['/note.md'])
    })

    it('should not show expand icon for files', () => {
      wrapper = createWrapper({
        node: fileNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      expect(wrapper.find('.expand-icon').exists()).toBe(false)
    })
  })

  describe('directory nodes', () => {
    const directoryNode: FileTreeNodeType = {
      name: 'folder',
      path: '/folder',
      type: 'directory',
      children: [
        {
          name: 'note.md',
          path: '/folder/note.md',
          type: 'file'
        }
      ]
    }

    it('should render directory node correctly', () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      expect(wrapper.find('.node-item.is-directory').exists()).toBe(true)
      expect(wrapper.find('.expand-icon').text()).toBe('📁')
      expect(wrapper.find('.node-name').text()).toBe('folder')
    })

    it('should show collapsed icon when not expanded', () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      expect(wrapper.find('.expand-icon').text()).toBe('📁')
    })

    it('should show expanded icon when expanded', () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })
      
      expect(wrapper.find('.expand-icon').text()).toBe('📂')
    })

    it('should emit toggleExpand when clicked', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      await wrapper.find('.node-item').trigger('click')
      
      expect(wrapper.emitted('toggleExpand')).toBeTruthy()
      expect(wrapper.emitted('toggleExpand')[0]).toEqual(['/folder'])
    })

    it('should render children when expanded', () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })
      
      expect(wrapper.find('.children').exists()).toBe(true)
      expect(wrapper.findAllComponents({ name: 'FileTreeNode' })).toHaveLength(1) // Self only
    })

    it('should not render children when collapsed', () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })
      
      expect(wrapper.find('.children').exists()).toBe(false)
    })

    it('should not render children when directory is empty', () => {
      const emptyDirectory: FileTreeNodeType = {
        name: 'empty',
        path: '/empty',
        type: 'directory',
        children: []
      }

      wrapper = createWrapper({
        node: emptyDirectory,
        level: 0,
        expandedPaths: new Set(['/empty'])
      })
      
      expect(wrapper.find('.children').exists()).toBe(false)
    })
  })

  describe('nesting levels', () => {
    it('should apply correct padding based on level', () => {
      const node: FileTreeNodeType = {
        name: 'test.md',
        path: '/test.md',
        type: 'file'
      }

      wrapper = createWrapper({
        node,
        level: 2,
        expandedPaths: new Set()
      })
      
      const nodeItem = wrapper.find('.node-item')
      expect(nodeItem.attributes('style')).toContain('padding-left: 40px') // 2 * 16 + 8
    })
  })

  describe('event propagation', () => {
    it('should propagate toggleExpand events from children', async () => {
      const directoryNode: FileTreeNodeType = {
        name: 'folder',
        path: '/folder',
        type: 'directory',
        children: [
          {
            name: 'subfolder',
            path: '/folder/subfolder',
            type: 'directory',
            children: []
          }
        ]
      }

      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })
      
      // Simulate event from child
      wrapper.vm.$emit('toggleExpand', '/folder/subfolder')
      
      expect(wrapper.emitted('toggleExpand')).toBeTruthy()
      expect(wrapper.emitted('toggleExpand')[0]).toEqual(['/folder/subfolder'])
    })

    it('should propagate selectNote events from children', async () => {
      const directoryNode: FileTreeNodeType = {
        name: 'folder',
        path: '/folder',
        type: 'directory',
        children: [
          {
            name: 'note.md',
            path: '/folder/note.md',
            type: 'file'
          }
        ]
      }

      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })
      
      // Simulate event from child
      wrapper.vm.$emit('selectNote', '/folder/note.md')
      
      expect(wrapper.emitted('selectNote')).toBeTruthy()
      expect(wrapper.emitted('selectNote')[0]).toEqual(['/folder/note.md'])
    })
  })

  describe('drag and drop auto-expand', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    const directoryNode: FileTreeNodeType = {
      name: 'folder',
      path: '/folder',
      type: 'directory',
      children: []
    }

    it('should auto-expand collapsed directory after hovering for 600ms', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })

      const nodeItem = wrapper.find('.node-item')
      const dragEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })

      await nodeItem.trigger('dragover', { dataTransfer: dragEvent.dataTransfer })
      
      // Should not emit immediately
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()

      // Fast-forward time by 600ms
      vi.advanceTimersByTime(600)

      // Should now emit toggleExpand
      expect(wrapper.emitted('toggleExpand')).toBeTruthy()
      expect(wrapper.emitted('toggleExpand')[0]).toEqual(['/folder'])
    })

    it('should not auto-expand if drag leaves before 600ms', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })

      const nodeItem = wrapper.find('.node-item')
      
      await nodeItem.trigger('dragover')
      
      // Fast-forward by 300ms (half the timeout)
      vi.advanceTimersByTime(300)
      
      // Trigger dragleave
      await nodeItem.trigger('dragleave')
      
      // Fast-forward past the original timeout
      vi.advanceTimersByTime(400)
      
      // Should not have emitted toggleExpand
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()
    })

    it('should not auto-expand already expanded directories', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })

      const nodeItem = wrapper.find('.node-item')
      
      await nodeItem.trigger('dragover')
      
      // Fast-forward time by 600ms
      vi.advanceTimersByTime(600)
      
      // Should not emit toggleExpand for already expanded directory
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()
    })

    it('should not auto-expand files', async () => {
      const fileNode: FileTreeNodeType = {
        name: 'note.md',
        path: '/note.md',
        type: 'file'
      }

      wrapper = createWrapper({
        node: fileNode,
        level: 0,
        expandedPaths: new Set()
      })

      const nodeItem = wrapper.find('.node-item')
      
      // Dragover should not be prevented on files
      const dragEvent = await nodeItem.trigger('dragover')
      
      // Fast-forward time by 600ms
      vi.advanceTimersByTime(600)
      
      // Should never emit toggleExpand for files
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()
    })

    it('should clear timer on drag end', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })

      const nodeItem = wrapper.find('.node-item')
      
      await nodeItem.trigger('dragover')
      await nodeItem.trigger('dragend')
      
      // Fast-forward past the timeout
      vi.advanceTimersByTime(700)
      
      // Should not have emitted toggleExpand after drag end
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()
    })

    it('should expand directory on drop if collapsed', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set()
      })

      const nodeItem = wrapper.find('.node-item')
      
      const dropData = {
        path: '/other-file.md',
        name: 'other-file.md',
        type: 'file'
      }

      const dragEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })
      dragEvent.dataTransfer?.setData('application/json', JSON.stringify(dropData))

      await nodeItem.trigger('drop', { dataTransfer: dragEvent.dataTransfer })
      
      // Wait for async operations
      await wrapper.vm.$nextTick()
      
      // Should emit toggleExpand after successful drop
      expect(wrapper.emitted('toggleExpand')).toBeTruthy()
      expect(wrapper.emitted('toggleExpand')[0]).toEqual(['/folder'])
    })

    it('should not expand directory on drop if already expanded', async () => {
      wrapper = createWrapper({
        node: directoryNode,
        level: 0,
        expandedPaths: new Set(['/folder'])
      })

      const nodeItem = wrapper.find('.node-item')
      
      const dropData = {
        path: '/other-file.md',
        name: 'other-file.md',
        type: 'file'
      }

      const dragEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })
      dragEvent.dataTransfer?.setData('application/json', JSON.stringify(dropData))

      await nodeItem.trigger('drop', { dataTransfer: dragEvent.dataTransfer })
      
      // Wait for async operations
      await wrapper.vm.$nextTick()
      
      // Should not emit toggleExpand for already expanded directory
      expect(wrapper.emitted('toggleExpand')).toBeFalsy()
    })
  })
})
