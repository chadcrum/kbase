import type { MilkdownPlugin } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state'
import { Decoration, DecorationSet, EditorView } from '@milkdown/prose/view'
import type { Node as ProseMirrorNode } from '@milkdown/prose/model'
import { liftListItem, sinkListItem } from '@milkdown/prose/schema-list'

const TASK_ITEM_CLASS = 'milkdown-task-item'
const TASK_ITEM_CHECKED_CLASS = 'milkdown-task-item--checked'
const TASK_CHECKBOX_CLASS = 'milkdown-task-checkbox'
const TASK_POS_DATA_KEY = 'milkdownTaskPos'

const createTaskCheckbox = (pos: number, checked: boolean) => {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.classList.add(TASK_CHECKBOX_CLASS)
  checkbox.dataset[TASK_POS_DATA_KEY] = String(pos)
  checkbox.contentEditable = 'false'
  checkbox.tabIndex = 0
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

    const classes = [TASK_ITEM_CLASS]
    if (Boolean(node.attrs.checked)) {
      classes.push(TASK_ITEM_CHECKED_CLASS)
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: classes.join(' '),
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

const handleCheckboxChange = (view: EditorView, target: EventTarget | null): boolean => {
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

const setSelectionAtListItem = (view: EditorView, pos: number): boolean => {
  const { doc } = view.state
  const clampPos = (value: number) => Math.max(0, Math.min(value, Math.max(0, doc.content.size)))

  const resolvedStart = doc.resolve(clampPos(pos + 1))
  const selection =
    TextSelection.findFrom(resolvedStart, 1, true) ??
    TextSelection.findFrom(resolvedStart, -1, true)

  if (!selection) {
    return false
  }

  view.dispatch(view.state.tr.setSelection(selection))
  return true
}

const indentListItem = (view: EditorView, pos: number) => {
  const listItemType = view.state.schema.nodes.list_item
  if (!listItemType) return false
  if (!setSelectionAtListItem(view, pos)) return false
  return sinkListItem(listItemType)(view.state, view.dispatch)
}

const outdentListItem = (view: EditorView, pos: number) => {
  const listItemType = view.state.schema.nodes.list_item
  if (!listItemType) return false
  if (!setSelectionAtListItem(view, pos)) return false
  return liftListItem(listItemType)(view.state, view.dispatch)
}

const focusCheckboxForSelection = (view: EditorView) => {
  requestAnimationFrame(() => {
    const selectionPos = Math.max(0, view.state.selection.from)
    const domAtPos = view.domAtPos(selectionPos)
    let element = domAtPos.node as Node | null

    if (element?.nodeType === Node.TEXT_NODE) {
      element = element.parentElement
    }

    if (!(element instanceof HTMLElement)) {
      view.focus()
      return
    }

    const taskItem = element.closest<HTMLElement>(`.${TASK_ITEM_CLASS}`)
    const checkbox = taskItem?.querySelector<HTMLInputElement>(`.${TASK_CHECKBOX_CLASS}`)

    if (checkbox) {
      checkbox.focus()
    } else {
      view.focus()
    }
  })
}

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
        keydown: (view, event) => {
          const target = event.target as HTMLElement | null
          if (!target?.classList.contains(TASK_CHECKBOX_CLASS)) return false

          const pos = Number(target.dataset[TASK_POS_DATA_KEY])
          if (Number.isNaN(pos)) return false

          if (event.key === 'Tab') {
            event.preventDefault()
            const handled = event.shiftKey
              ? outdentListItem(view, pos)
              : indentListItem(view, pos)

            if (handled) {
              focusCheckboxForSelection(view)
              return true
            }
          }

          return false
        },
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



