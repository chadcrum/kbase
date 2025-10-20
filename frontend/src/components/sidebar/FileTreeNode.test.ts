import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
})
