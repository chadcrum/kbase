import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Schema } from '@milkdown/prose/model'
import { EditorState } from '@milkdown/prose/state'
import {
  createTaskListProsePlugin,
  taskListCheckboxPluginKey,
} from '../plugins/milkdownTaskListPlugin'

const createTestSchema = () => {
  return new Schema({
    nodes: {
      doc: {
        content: 'block+',
      },
      text: {},
      paragraph: {
        content: 'text*',
        group: 'block',
      },
      bullet_list: {
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: {
          checked: { default: null },
        },
        content: 'paragraph block*',
        defining: true,
      },
    },
    marks: {},
  })
}

const createState = (
  schema: Schema,
  plugin = createTaskListProsePlugin(),
  items: Array<{ text: string; checked: boolean | null; children?: Array<{ text: string; checked: boolean | null }> }> = [
    { text: 'Task 1', checked: true },
  ]
) => {
  const listItems = items.map((item) => {
    const content = [
      schema.node('paragraph', undefined, schema.text(item.text)),
      ...(item.children
        ? [
            schema.node(
              'bullet_list',
              undefined,
              item.children.map((child) =>
                schema.node(
                  'list_item',
                  { checked: child.checked },
                  schema.node('paragraph', undefined, schema.text(child.text))
                )
              )
            ),
          ]
        : []),
    ]

    return schema.node('list_item', { checked: item.checked }, content)
  })

  const list = schema.node('bullet_list', undefined, listItems)
  const doc = schema.node('doc', undefined, list)

  return EditorState.create({
    doc,
    schema,
    plugins: [plugin],
  })
}

describe('milkdownTaskListPlugin', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame

  beforeEach(() => {
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0)
      return 0 as unknown as number
    }) as typeof globalThis.requestAnimationFrame
  })

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
  })

  it('adds checkbox decoration for task list items', () => {
    const schema = createTestSchema()
    const plugin = createTaskListProsePlugin()
    const state = createState(schema, plugin)
    const decorations = plugin.getState(state) as ReturnType<typeof taskListCheckboxPluginKey['getState']>
    expect(decorations).toBeDefined()

    const allDecorations = decorations?.find(0, state.doc.content.size)
    expect(allDecorations?.length ?? 0).toBeGreaterThan(0)
    const widget = allDecorations?.find((decoration) => {
      return Boolean((decoration as any).type?.toDOM)
    })

    expect(widget).toBeDefined()
    const widgetDom = (widget as any).type.toDOM
    expect(widgetDom).toBeInstanceOf(HTMLInputElement)
    expect(widgetDom.dataset.milkdownTaskPos).toBeDefined()
    expect(widgetDom.getAttribute('type')).toBe('checkbox')
  })

  it('toggles checked attribute when checkbox changes', () => {
    const schema = createTestSchema()
    const plugin = createTaskListProsePlugin()
    let state = createState(schema, plugin, [{ text: 'Task 1', checked: false }])
    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr)
        view.state = state
      }),
    }

    let listItemPos = -1
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'list_item') {
        listItemPos = pos
        return false
      }
      return
    })

    const input = document.createElement('input')
    input.checked = true
    input.dataset.milkdownTaskPos = `${listItemPos}`
    input.classList.add('milkdown-task-checkbox')

    const changeEvent = new Event('change', { bubbles: true })
    Object.defineProperty(changeEvent, 'target', {
      value: input,
    })

    const handled = plugin.props.handleDOMEvents?.change?.call(plugin, view as any, changeEvent)

    expect(handled).toBe(true)
    expect(view.dispatch).toHaveBeenCalled()

    const updatedNode = view.state.doc.nodeAt(listItemPos)
    expect(updatedNode?.attrs.checked).toBe(true)
  })

  it('indents task list item when Tab pressed on checkbox', () => {
    const schema = createTestSchema()
    const plugin = createTaskListProsePlugin()
    let state = createState(schema, plugin, [
      { text: 'Parent task', checked: null },
      { text: 'Child task', checked: true },
    ])

    const checkboxDom = document.createElement('input')
    checkboxDom.classList.add('milkdown-task-checkbox')
    const listItemDom = document.createElement('li')
    listItemDom.classList.add('milkdown-task-item')
    listItemDom.appendChild(checkboxDom)
    const checkboxFocusSpy = vi.spyOn(checkboxDom, 'focus')

    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr)
        view.state = state
      }),
      focus: vi.fn(),
      domAtPos: vi.fn(() => ({ node: checkboxDom, offset: 0 })),
    }

    let targetPos = -1
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'list_item' && node.attrs.checked === true) {
        targetPos = pos
        return false
      }
      return
    })

    expect(targetPos).toBeGreaterThan(-1)

    const input = document.createElement('input')
    input.checked = true
    input.dataset.milkdownTaskPos = `${targetPos}`
    input.classList.add('milkdown-task-checkbox')

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    Object.defineProperty(tabEvent, 'target', { value: input })

    const handled = plugin.props.handleDOMEvents?.keydown?.call(plugin, view as any, tabEvent)

    expect(handled).toBe(true)
    const rootList = view.state.doc.firstChild
    expect(rootList?.childCount).toBe(1)
    const nestedList = rootList?.firstChild?.lastChild
    expect(nestedList?.type.name).toBe('bullet_list')
    expect(checkboxFocusSpy).toHaveBeenCalled()
  })

  it('outdents task list item when Shift+Tab pressed on checkbox', () => {
    const schema = createTestSchema()
    const plugin = createTaskListProsePlugin()
    let state = createState(schema, plugin, [
      {
        text: 'Parent task',
        checked: null,
        children: [{ text: 'Nested task', checked: true }],
      },
    ])

    const checkboxDom = document.createElement('input')
    checkboxDom.classList.add('milkdown-task-checkbox')
    const listItemDom = document.createElement('li')
    listItemDom.classList.add('milkdown-task-item')
    listItemDom.appendChild(checkboxDom)
    const checkboxFocusSpy = vi.spyOn(checkboxDom, 'focus')

    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr)
        view.state = state
      }),
      focus: vi.fn(),
      domAtPos: vi.fn(() => ({ node: checkboxDom, offset: 0 })),
    }

    let targetPos = -1
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'list_item' && node.attrs.checked === true) {
        targetPos = pos
        return false
      }
      return
    })

    expect(targetPos).toBeGreaterThan(-1)

    const input = document.createElement('input')
    input.checked = true
    input.dataset.milkdownTaskPos = `${targetPos}`
    input.classList.add('milkdown-task-checkbox')

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    })
    Object.defineProperty(shiftTabEvent, 'target', { value: input })

    const handled = plugin.props.handleDOMEvents?.keydown?.call(plugin, view as any, shiftTabEvent)

    expect(handled).toBe(true)
    const rootList = view.state.doc.firstChild
    expect(rootList?.childCount).toBe(2)
    const secondItem = rootList?.lastChild
    expect(secondItem?.attrs.checked).toBe(true)
    expect(checkboxFocusSpy).toHaveBeenCalled()
  })
})


