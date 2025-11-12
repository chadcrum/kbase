import { describe, expect, it, vi } from 'vitest'
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

const createState = (schema: Schema, plugin = createTaskListProsePlugin(), checked: boolean | null = true) => {
  const paragraph = schema.node('paragraph', undefined, schema.text('Task 1'))
  const listItem = schema.node('list_item', { checked }, paragraph)
  const list = schema.node('bullet_list', undefined, listItem)
  const doc = schema.node('doc', undefined, list)

  return EditorState.create({
    doc,
    schema,
    plugins: [plugin],
  })
}

describe('milkdownTaskListPlugin', () => {
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
    let state = createState(schema, plugin, false)
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

    const handled = plugin.props.handleDOMEvents?.change?.(view as any, changeEvent)

    expect(handled).toBe(true)
    expect(view.dispatch).toHaveBeenCalled()

    const updatedNode = view.state.doc.nodeAt(listItemPos)
    expect(updatedNode?.attrs.checked).toBe(true)
  })
})


