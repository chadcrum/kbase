import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MilkdownEditor from './MilkdownEditor.vue'

const { editorViewCtxSymbol, focusMock, actionMock } = vi.hoisted(() => {
  const focusMock = vi.fn()
  const editorViewCtxSymbol = Symbol('editorViewCtx')
  const actionMock = vi.fn((callback: (ctx: { get: (key: symbol) => unknown }) => void | Promise<void>) => {
    const view = {
      hasFocus: () => false,
      focus: focusMock,
      state: {
        doc: { childCount: 1 },
      },
      dispatch: vi.fn(),
    }

    callback({
      get: (key: symbol) => (key === editorViewCtxSymbol ? view : null),
    })

    return Promise.resolve()
  })

  return { editorViewCtxSymbol, focusMock, actionMock }
})

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

    use() {
      return this
    }

    async create() {
      return this.#instance
    }
  }

  return {
    Editor: {
      make: vi.fn(() => new EditorBuilder()),
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

vi.mock('@milkdown/plugin-listener', () => ({
  listener: Symbol('listener'),
  listenerCtx: Symbol('listenerCtx'),
}))

vi.mock('@milkdown/theme-nord', () => ({
  nord: Symbol('nord'),
}))

describe('MilkdownEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    focusMock.mockClear()
    actionMock.mockClear()
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
})


