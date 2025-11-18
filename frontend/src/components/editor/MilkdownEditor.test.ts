import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MilkdownEditor from './MilkdownEditor.vue'
import { apiClient } from '@/api/client'

const mockApiClient = vi.mocked(apiClient)

const { editorViewCtxSymbol, focusMock, actionMock, useCalls, taskListPluginSymbol } = vi.hoisted(() => {
  const focusMock = vi.fn()
  const editorViewCtxSymbol = Symbol('editorViewCtx')
  const useCalls: unknown[] = []
  const taskListPluginSymbol = Symbol('taskListPlugin')
  const actionMock = vi.fn((callback: (ctx: { get: (key: symbol) => unknown }) => void | Promise<void>) => {
    const view = {
      hasFocus: () => false,
      focus: focusMock,
      state: {
        doc: { childCount: 1 },
      },
      dispatch: vi.fn(),
      dom: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    }

    callback({
      get: (key: symbol) => (key === editorViewCtxSymbol ? view : null),
    })

    return Promise.resolve()
  })

  return { editorViewCtxSymbol, focusMock, actionMock, useCalls, taskListPluginSymbol }
})

vi.mock('./plugins/milkdownTaskListPlugin', () => ({
  milkdownTaskListPlugin: taskListPluginSymbol,
}))

vi.mock('./plugins/milkdownImagePlugin', () => ({
  milkdownImagePlugin: Symbol('milkdownImagePlugin'),
}))

vi.mock('@milkdown/core', () => {
  class EditorInstance {
    action = actionMock
    destroy = vi.fn()
  }

  class EditorBuilder {
    #instance = new EditorInstance()

    config() {
      return this
    }

    use(plugin: unknown) {
      useCalls.push(plugin)
      return this
    }

    async create() {
      return this.#instance
    }
  }

  return {
    Editor: {
      make: vi.fn(() => new EditorBuilder()),
      getUseCalls: () => useCalls,
    },
    editorViewCtx: editorViewCtxSymbol,
    rootCtx: Symbol('rootCtx'),
    defaultValueCtx: Symbol('defaultValueCtx'),
    commandsCtx: Symbol('commandsCtx'),
    keymapCtx: Symbol('keymapCtx'),
    KeymapReady: Symbol('KeymapReady'),
  }
})

vi.mock('@milkdown/preset-commonmark', () => ({
  commonmark: Symbol('commonmark'),
  sinkListItemCommand: { key: 'sink-list-item' },
  liftListItemCommand: { key: 'lift-list-item' },
}))

vi.mock('@milkdown/preset-gfm', () => ({
  gfm: Symbol('gfm'),
}))

vi.mock('@milkdown/plugin-indent', () => ({
  indent: Symbol('indent'),
}))

const { historySymbol } = vi.hoisted(() => ({
  historySymbol: Symbol('history'),
}))

vi.mock('@milkdown/plugin-history', () => ({
  history: historySymbol,
  undoCommand: { key: 'undo' },
  redoCommand: { key: 'redo' },
}))

vi.mock('@milkdown/plugin-listener', () => ({
  listener: Symbol('listener'),
  listenerCtx: Symbol('listenerCtx'),
}))

vi.mock('@milkdown/theme-nord', () => ({
  nord: Symbol('nord'),
}))

vi.mock('@/api/client', () => ({
  apiClient: {
    uploadImage: vi.fn(),
  },
}))

describe('MilkdownEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    focusMock.mockClear()
    actionMock.mockClear()
    useCalls.length = 0
  })

  it('focuses the editor view when the container receives pointer interaction', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
      },
    })

    await flushPromises()
    const initialFocusCalls = focusMock.mock.calls.length

    await wrapper.find('.milkdown-editor-container').trigger('mousedown')
    await flushPromises()

    expect(focusMock.mock.calls.length).toBe(initialFocusCalls + 1)
    expect(actionMock).toHaveBeenCalled()
    expect(useCalls).toContain(taskListPluginSymbol)
  })

  it('does not attempt to focus when editor is disabled', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
        disabled: true,
      },
    })

    await flushPromises()
    await wrapper.find('.milkdown-editor-container').trigger('mousedown')
    await flushPromises()

    expect(focusMock).not.toHaveBeenCalled()
  })

  it('uses history plugin for undo/redo functionality', async () => {
    mount(MilkdownEditor, {
      props: {
        modelValue: 'test content',
        path: '/test.md',
      },
    })

    await flushPromises()

    expect(useCalls).toContain(historySymbol)
  })

  it('handles image paste events', async () => {
    mockApiClient.uploadImage.mockResolvedValue('/_resources/test.png')

    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
      },
    })

    await flushPromises()

    // Create a mock image file
    const mockFile = new File(['fake image content'], 'test.png', { type: 'image/png' })

    // Create a mock paste event with image data
    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => mockFile,
          },
        ],
      },
    } as any

    // Trigger paste event
    await wrapper.find('.milkdown-editor-container').trigger('paste', pasteEvent)

    // Wait for async operations
    await flushPromises()

    // Check that uploadImage was called
    expect(mockApiClient.uploadImage).toHaveBeenCalledWith(mockFile)

    // Check that action was called to insert image
    expect(actionMock).toHaveBeenCalled()
  })

  it('handles image drag and drop events', async () => {
    mockApiClient.uploadImage.mockResolvedValue('/_resources/test.jpg')

    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
      },
    })

    await flushPromises()

    // Create a mock image file
    const mockFile = new File(['fake image content'], 'test.jpg', { type: 'image/jpeg' })

    // Create a mock drop event with image file
    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [mockFile],
      },
    } as any

    // Trigger drop event
    await wrapper.find('.milkdown-editor-container').trigger('drop', dropEvent)

    // Wait for async operations
    await flushPromises()

    // Check that uploadImage was called
    expect(mockApiClient.uploadImage).toHaveBeenCalledWith(mockFile)

    // Check that action was called to insert image
    expect(actionMock).toHaveBeenCalled()
  })

  it('ignores paste events when disabled', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
        disabled: true,
      },
    })

    await flushPromises()

    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => new File([], 'test.png'),
          },
        ],
      },
    } as any

    await wrapper.find('.milkdown-editor-container').trigger('paste', pasteEvent)

    expect(mockApiClient.uploadImage).not.toHaveBeenCalled()
  })

  it('ignores drag events when disabled', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
        disabled: true,
      },
    })

    await flushPromises()

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [new File([], 'test.jpg')],
      },
    } as any

    await wrapper.find('.milkdown-editor-container').trigger('drop', dropEvent)

    expect(mockApiClient.uploadImage).not.toHaveBeenCalled()
  })

  it('ignores non-image paste items', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '',
        path: '/test.md',
      },
    })

    await flushPromises()

    const pasteEvent = {
      preventDefault: vi.fn(),
      clipboardData: {
        items: [
          {
            type: 'text/plain',
            getAsFile: () => null,
          },
        ],
      },
    } as any

    await wrapper.find('.milkdown-editor-container').trigger('paste', pasteEvent)

    expect(mockApiClient.uploadImage).not.toHaveBeenCalled()
  })
})


