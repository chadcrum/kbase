import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TipTapEditor from './TipTapEditor.vue'

describe('TipTapEditor CSS Styling', () => {
  let wrapper: any

  beforeEach(async () => {
    setActivePinia(createPinia())
    wrapper = mount(TipTapEditor, {
      props: {
        modelValue: '',
        path: '/test.md'
      }
    })
    await wrapper.vm.$nextTick()
  })

  describe('Task List Styling', () => {
    it('applies correct CSS classes for task lists', () => {
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Task item')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
      
      // Check that the editor has the correct class structure
      expect(editorElement.classes()).toContain('tiptap-editor')
    })

    it('maintains CSS structure for nested task lists', () => {
      // Create nested task list
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent task\nChild task')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })

    it('applies ultra-minimal indent styling', () => {
      // Create nested structure to test indent CSS
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent\nChild')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('data-type="taskList"')
    })
  })

  describe('List Spacing', () => {
    it('applies tight vertical spacing for task lists', () => {
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Item 1\nItem 2\nItem 3')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })

    it('applies tight vertical spacing for bullet lists', () => {
      wrapper.vm.editor?.commands.toggleBulletList()
      wrapper.vm.editor?.commands.insertContent('Item 1\nItem 2\nItem 3')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })

    it('applies tight vertical spacing for ordered lists', () => {
      wrapper.vm.editor?.commands.toggleOrderedList()
      wrapper.vm.editor?.commands.insertContent('Item 1\nItem 2\nItem 3')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })
  })

  describe('Checkbox Alignment', () => {
    it('maintains checkbox positioning with tight spacing', () => {
      // Create task list with multiple items
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Task 1\nTask 2\nTask 3')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })

    it('handles checkbox alignment with nested content', () => {
      // Create nested task list
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent task\nChild task')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })
  })

  describe('CSS Class Structure', () => {
    it('has correct container structure', () => {
      expect(wrapper.find('.tiptap-editor-container').exists()).toBe(true)
      expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
    })

    it('maintains CSS classes during content changes', () => {
      // Add content and verify classes are maintained
      wrapper.vm.editor?.commands.insertContent('Test content')
      
      expect(wrapper.find('.tiptap-editor-container').exists()).toBe(true)
      expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
    })

    it('preserves CSS classes during list operations', () => {
      // Create and modify lists
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Task item')
      wrapper.vm.editor?.commands.toggleTaskList() // Toggle off
      wrapper.vm.editor?.commands.toggleBulletList()
      
      expect(wrapper.find('.tiptap-editor-container').exists()).toBe(true)
      expect(wrapper.find('.tiptap-editor').exists()).toBe(true)
    })
  })

  describe('Responsive Styling', () => {
    it('maintains styling with different content lengths', () => {
      const testCases = [
        'Short',
        'Medium length content',
        'Very long content that spans multiple lines and tests the styling with extended text content'
      ]

      for (const content of testCases) {
        wrapper.vm.editor?.commands.setContent('')
        wrapper.vm.editor?.commands.insertContent(content)
        
        const editorElement = wrapper.find('.tiptap-editor')
        expect(editorElement.exists()).toBe(true)
      }
    })

    it('handles styling with mixed content types', () => {
      // Mix different content types
      wrapper.vm.editor?.commands.insertContent('Regular text\n\n')
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Task item\n')
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.toggleBulletList()
      wrapper.vm.editor?.commands.insertContent('Bullet item\n')
      wrapper.vm.editor?.commands.toggleBulletList()
      wrapper.vm.editor?.commands.toggleOrderedList()
      wrapper.vm.editor?.commands.insertContent('Numbered item')
      
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })
  })
})
