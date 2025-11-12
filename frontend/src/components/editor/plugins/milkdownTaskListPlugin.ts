import type { MilkdownPlugin } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet, EditorView } from '@milkdown/prose/view'
import type { Node as ProseMirrorNode } from '@milkdown/prose/model'

const TASK_ITEM_CLASS = 'milkdown-task-item'
const TASK_CHECKBOX_CLASS = 'milkdown-task-checkbox'
const TASK_POS_DATA_KEY = 'milkdownTaskPos'

const createTaskCheckbox = (pos: number, checked: boolean) => {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.classList.add(TASK_CHECKBOX_CLASS)
  checkbox.dataset[TASK_POS_DATA_KEY] = String(pos)
  checkbox.contentEditable = 'false'
  checkbox.tabIndex = -1
  checkbox.checked = checked

  return checkbox
}

const createDecorations = (doc: ProseMirrorNode) => {
  const decorations: Array<Decoration> = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'list_item' || node.attrs.checked == null) {
      return
    }

    const checkbox = createTaskCheckbox(pos, Boolean(node.attrs.checked))
    decorations.push(
      Decoration.widget(pos + 1, checkbox, {
        side: -1,
        ignoreSelection: true,
      })
    )

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: TASK_ITEM_CLASS,
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

const handleCheckboxChange = (view: EditorView, target: EventTarget): boolean => {
  if (!(target instanceof HTMLInputElement)) return false
  if (!target.classList.contains(TASK_CHECKBOX_CLASS)) return false

  const pos = Number(target.dataset[TASK_POS_DATA_KEY])
  if (Number.isNaN(pos)) return false

  const node = view.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'list_item') return false

  const tr = view.state.tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    checked: target.checked,
  })

  view.dispatch(tr)
  return true
}

export const taskListCheckboxPluginKey = new PluginKey<DecorationSet>('milkdown-task-checkbox')

export const createTaskListProsePlugin = () =>
  new Plugin<DecorationSet>({
    key: taskListCheckboxPluginKey,
    state: {
      init: (_, state) => createDecorations(state.doc),
      apply: (tr, decorations, _oldState, newState) => {
        if (tr.docChanged) {
          return createDecorations(newState.doc)
        }

        return decorations?.map(tr.mapping, tr.doc) ?? createDecorations(newState.doc)
      },
    },
    props: {
      decorations: (state) => taskListCheckboxPluginKey.getState(state) ?? null,
      handleDOMEvents: {
        change: (view, event) => handleCheckboxChange(view, event.target),
        mousedown: (_, event) => {
          const target = event.target as HTMLElement | null
          if (target?.classList.contains(TASK_CHECKBOX_CLASS)) {
            event.preventDefault()
            return true
          }

          return false
        },
      },
    },
  })

export const milkdownTaskListPlugin: MilkdownPlugin = $prose(() => createTaskListProsePlugin())

export type { DecorationSet }



