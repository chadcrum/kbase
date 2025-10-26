import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TipTapToolbar from './TipTapToolbar.vue'

// Simple mock editor
const mockEditor = {
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleStrike: vi.fn(() => ({ run: vi.fn() })),
      toggleCode: vi.fn(() => ({ run: vi.fn() })),
      toggleHeading: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
      toggleTaskList: vi.fn(() => ({ run: vi.fn() })),
      insertContent: vi.fn(() => ({ run: vi.fn() })),
      deleteRange: vi.fn(() => ({ run: vi.fn() })),
      sinkListItem: vi.fn(() => ({ run: vi.fn() })),
      liftListItem: vi.fn(() => ({ run: vi.fn() })),
      undo: vi.fn(() => ({ run: vi.fn() })),
      redo: vi.fn(() => ({ run: vi.fn() }))
    }))
  })),
  isActive: vi.fn(() => false),
  can: vi.fn(() => ({
    undo: vi.fn(() => true),
    redo: vi.fn(() => true)
  })),
  commands: {
    sinkListItem: vi.fn(() => false),
    liftListItem: vi.fn(() => false),
    insertContent: vi.fn(),
    deleteRange: vi.fn()
  }
} as any

describe('TipTapToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders all toolbar buttons', () => {
    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: mockEditor
      }
    })

    expect(wrapper.find('.tiptap-toolbar').exists()).toBe(true)
    expect(wrapper.find('.toolbar-group').exists()).toBe(true)
    expect(wrapper.findAll('.toolbar-btn')).toHaveLength(17) // Count of all buttons
  })

  it('calls editor commands when buttons are clicked', async () => {
    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: mockEditor
      }
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[0].trigger('click')
    expect(mockEditor.chain).toHaveBeenCalled()
  })

  it('shows active state', () => {
    const activeEditor = {
      ...mockEditor,
      isActive: vi.fn((format) => format === 'bold')
    }

    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: activeEditor
      }
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons[0].classes()).toContain('is-active')
  })

  it('handles indent button click', async () => {
    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: mockEditor
      }
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[0].trigger('click')
    expect(mockEditor.chain).toHaveBeenCalled()
  })

  it('handles outdent button click', async () => {
    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: mockEditor
      }
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    expect(buttons.length).toBeGreaterThan(0)

    await buttons[1].trigger('click')
    expect(mockEditor.chain).toHaveBeenCalled()
  })

  it('applies correct CSS classes', () => {
    const wrapper = mount(TipTapToolbar, {
      props: {
        editor: mockEditor
      }
    })

    expect(wrapper.find('.tiptap-toolbar').exists()).toBe(true)
    expect(wrapper.find('.toolbar-group').exists()).toBe(true)
  })
})
