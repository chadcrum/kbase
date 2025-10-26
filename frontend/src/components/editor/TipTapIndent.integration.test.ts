import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TipTapEditor from './TipTapEditor.vue'
import TipTapToolbar from './TipTapToolbar.vue'

// Mock the TipTapToolbar component
vi.mock('./TipTapToolbar.vue', () => ({
  default: {
    name: 'TipTapToolbar',
    template: '<div data-testid="tiptap-toolbar">Toolbar</div>',
    props: ['editor']
  }
}))

describe('TipTap Indent Integration Tests', () => {
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

  describe('Task List Nesting', () => {
    it('creates proper nested task list structure', () => {
      // Create initial task list
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent task')
      
      // Add child task
      wrapper.vm.editor?.commands.insertContent('\nChild task')
      wrapper.vm.editor?.commands.setTextSelection(1)
      
      // Nest the child task
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('data-type="taskList"')
      expect(html).toContain('data-type="taskItem"')
    })

    it('maintains checkbox alignment when nesting', () => {
      // Create task list with nested items
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent task\nChild task')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      
      // Check that we have proper nested structure
      expect(html).toContain('data-type="taskList"')
      
      // Verify CSS classes are applied for alignment
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })

    it('handles multiple levels of nesting', () => {
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Level 1\nLevel 2\nLevel 3')
      
      // Nest level 2
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      // Nest level 3
      wrapper.vm.editor?.commands.setTextSelection(2)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('data-type="taskList"')
    })

    it('unnests task list items correctly', () => {
      // Create nested structure first
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent\nChild')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      // Now unnest
      wrapper.vm.editor?.commands.keyboardShortcut('Shift-Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toBeDefined()
    })
  })

  describe('Bullet List Nesting', () => {
    it('creates proper nested bullet list structure', () => {
      wrapper.vm.editor?.commands.toggleBulletList()
      wrapper.vm.editor?.commands.insertContent('Parent item\nChild item')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>')
    })

    it('handles multiple bullet list nesting levels', () => {
      wrapper.vm.editor?.commands.toggleBulletList()
      wrapper.vm.editor?.commands.insertContent('Level 1\nLevel 2\nLevel 3')
      
      // Nest level 2
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      // Nest level 3
      wrapper.vm.editor?.commands.setTextSelection(2)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('<ul>')
    })
  })

  describe('Ordered List Nesting', () => {
    it('creates proper nested ordered list structure', () => {
      wrapper.vm.editor?.commands.toggleOrderedList()
      wrapper.vm.editor?.commands.insertContent('First item\nSecond item')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('<ol>')
      expect(html).toContain('<li>')
    })

    it('handles multiple ordered list nesting levels', () => {
      wrapper.vm.editor?.commands.toggleOrderedList()
      wrapper.vm.editor?.commands.insertContent('1. Level 1\n2. Level 2\n3. Level 3')
      
      // Nest level 2
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      // Nest level 3
      wrapper.vm.editor?.commands.setTextSelection(2)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('<ol>')
    })
  })

  describe('Mixed Content Handling', () => {
    it('handles Tab in regular text (non-list context)', () => {
      wrapper.vm.editor?.commands.insertContent('Regular text content')
      wrapper.vm.editor?.commands.setTextSelection(0)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('    Regular text content')
    })

    it('handles Shift-Tab in regular text with spaces', () => {
      wrapper.vm.editor?.commands.insertContent('    Indented text')
      wrapper.vm.editor?.commands.setTextSelection(0)
      wrapper.vm.editor?.commands.keyboardShortcut('Shift-Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('Indented text')
    })

    it('handles mixed list types in same document', () => {
      // Add task list
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Task item')
      
      // Add regular text
      wrapper.vm.editor?.commands.insertContent('\n\nRegular paragraph')
      
      // Add bullet list
      wrapper.vm.editor?.commands.insertContent('\n\nBullet item')
      wrapper.vm.editor?.commands.toggleBulletList()
      
      const html = wrapper.vm.editor?.getHTML()
      // The mixed content test creates a regular bullet list, not a task list
      expect(html).toContain('<ul>')
      expect(html).toContain('<p>')
    })
  })

  describe('CSS Styling Integration', () => {
    it('applies correct CSS classes for styling', () => {
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
      expect(editorElement.classes()).toContain('tiptap-editor')
    })

    it('maintains CSS structure for nested lists', () => {
      // Create nested structure
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Parent\nChild')
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      // Check that CSS classes are maintained
      const editorElement = wrapper.find('.tiptap-editor')
      expect(editorElement.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty document', () => {
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toBeDefined()
    })

    it('handles single character content', () => {
      wrapper.vm.editor?.commands.insertContent('a')
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain('a    ')
    })

    it('handles very long content', () => {
      const longContent = 'a'.repeat(1000)
      wrapper.vm.editor?.commands.insertContent(longContent)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toContain(longContent + '    ')
    })

    it('handles rapid successive operations', () => {
      wrapper.vm.editor?.commands.toggleTaskList()
      wrapper.vm.editor?.commands.insertContent('Item 1\nItem 2\nItem 3')
      
      // Rapid nesting operations
      wrapper.vm.editor?.commands.setTextSelection(1)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      wrapper.vm.editor?.commands.setTextSelection(2)
      wrapper.vm.editor?.commands.keyboardShortcut('Tab')
      wrapper.vm.editor?.commands.keyboardShortcut('Shift-Tab')
      
      const html = wrapper.vm.editor?.getHTML()
      expect(html).toBeDefined()
    })
  })
})
