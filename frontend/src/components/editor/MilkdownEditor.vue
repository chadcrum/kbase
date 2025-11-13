<template>
  <div
    ref="editorContainer"
    class="milkdown-editor-container"
    @mousedown="handleContainerPointerDown"
    @touchstart="handleContainerPointerDown"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Editor,
  editorViewCtx,
  rootCtx,
  defaultValueCtx,
  commandsCtx,
  keymapCtx,
  KeymapReady,
  remarkStringifyOptionsCtx,
} from '@milkdown/core'
import { commonmark, sinkListItemCommand, liftListItemCommand } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { indent } from '@milkdown/plugin-indent'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import type { MilkdownPlugin } from '@milkdown/ctx'
import { TextSelection, type Command } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import type { Options } from 'remark-stringify'
import { useThemeStore } from '@/stores/theme'
import { loadNoteState, updateNoteStateSegment } from '@/utils/noteState'
import { milkdownTaskListPlugin } from './plugins/milkdownTaskListPlugin'

// Props
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
}>()

// Store
const themeStore = useThemeStore()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Editor | null = null
let editorView: EditorView | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let stateSaveTimeout: ReturnType<typeof setTimeout> | null = null
let currentMarkdown = ref<string>(props.modelValue)
const cleanupFns: Array<() => void> = []

// Custom remark stringify options to use hyphens for unordered list bullets
const customRemarkOptions: Options = {
  bullet: '-',
  encode: [],
}

const STATE_SAVE_DELAY = 150

const focusEditor = async () => {
  if (!editor || props.disabled) return

  try {
    await editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      if (!view) {
        return
      }

      if (!view.hasFocus()) {
        view.focus()
      }
    })
  } catch (error) {
    console.error('Failed to focus Milkdown editor:', error)
  }
}

// Debounce delay for auto-save (1 second)
const AUTO_SAVE_DELAY = 1000

// Command to insert spaces/tab at cursor
const insertSpacesCommand: Command = (state, dispatch) => {
  const { tr, selection } = state
  if (dispatch) {
    // Insert 2 spaces
    tr.insertText('  ', selection.from, selection.to)
    dispatch(tr)
  }
  return true
}

// Command to remove spaces at start of line
const removeSpacesCommand: Command = (state, dispatch) => {
  const { tr, selection, doc } = state
  const { $from } = selection
  const lineStart = $from.start()

  // Get text from start of line to cursor
  const textBefore = doc.textBetween(lineStart, selection.from)

  // Check if line starts with spaces
  const match = textBefore.match(/^(\s{1,4})/)
  if (match && dispatch) {
    const spacesToRemove = Math.min(match[1].length, 2) // Remove up to 2 spaces
    tr.delete(lineStart, lineStart + spacesToRemove)
    dispatch(tr)
    return true
  }
  return false
}

// Text indent keymap plugin
const textIndentPlugin: MilkdownPlugin = (ctx) => {
  return async () => {
    await ctx.wait(KeymapReady)
    const keymapManager = ctx.get(keymapCtx)
    const commandManager = ctx.get(commandsCtx)
    const dispose = keymapManager.addObjectKeymap({
      Tab: (state, dispatch) => {
        if (commandManager.call(sinkListItemCommand.key)) {
          return true
        }
        return insertSpacesCommand(state, dispatch)
      },
      'Shift-Tab': (state, dispatch) => {
        if (commandManager.call(liftListItemCommand.key)) {
          return true
        }
        return removeSpacesCommand(state, dispatch)
      },
    })

    return () => {
      dispose()
    }
  }
}

// Handle content change
const handleContentChange = (markdown: string) => {
  if (props.disabled) return
  
  currentMarkdown.value = markdown
  
  // Emit update for v-model
  emit('update:modelValue', markdown)
  
  // Debounced auto-save
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    emit('save', markdown)
  }, AUTO_SAVE_DELAY)
}

const cleanupMilkdownListeners = () => {
  cleanupFns.forEach(fn => fn())
  cleanupFns.length = 0
}

const saveMilkdownState = () => {
  if (!props.path || !editorView) return

  const { state } = editorView
  const selection = state.selection
  const selectionState = {
    from: selection.from,
    to: selection.to
  }

  const scrollState = {
    top: editorContainer.value?.scrollTop ?? 0
  }

  updateNoteStateSegment(props.path, 'milkdown', {
    selection: selectionState,
    scroll: scrollState
  })
}

const scheduleMilkdownStateSave = () => {
  if (!editorView || !props.path) return

  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }

  stateSaveTimeout = setTimeout(() => {
    if (!editorView || !props.path) return
    saveMilkdownState()
  }, STATE_SAVE_DELAY)
}

const handleCheckboxClick = (event: Event) => {
  const target = event.target as HTMLElement

  // Check if the clicked element is a checkbox in a task list
  if (target.tagName !== 'INPUT' || target.getAttribute('type') !== 'checkbox') {
    return
  }

  // Check if it's in a task list item
  const taskListItem = target.closest('.task-list-item')
  const view = editorView
  if (!taskListItem || !view) {
    return
  }

  // Prevent default to handle the toggle ourselves
  event.preventDefault()

  try {
    const { state, dispatch } = view
    const { doc, tr } = state

    // Find the position of the task list item in the document
    let pos = -1
    let found = false

    doc.descendants((node, nodePos) => {
      if (found) return false

      if (node.type.name === 'task_list_item') {
        // Get the DOM node for this position
        const domNode = view.domAtPos(nodePos + 1).node
        if (domNode && (domNode === taskListItem || domNode.contains(taskListItem as Node) || taskListItem.contains(domNode))) {
          pos = nodePos
          found = true
          return false
        }
      }
      return true
    })

    if (pos !== -1) {
      const node = doc.nodeAt(pos)
      if (node && node.type.name === 'task_list_item') {
        // Toggle the checked attribute
        const newAttrs = { ...node.attrs, checked: !node.attrs.checked }
        dispatch(tr.setNodeMarkup(pos, undefined, newAttrs))
      }
    }
  } catch (error) {
    console.error('Failed to toggle checkbox:', error)
  }
}

const setupMilkdownStateListeners = async () => {
  if (!editor) return

  cleanupMilkdownListeners()

  await editor.action((ctx) => {
    editorView = ctx.get(editorViewCtx)
  })

  if (!editorView) return

  const handleKeyUp = () => {
    scheduleMilkdownStateSave()
  }

  const handleMouseUp = () => {
    scheduleMilkdownStateSave()
  }

  const handleScroll = () => {
    scheduleMilkdownStateSave()
  }

  const handleSelectionChange = () => {
    if (!editorView) return
    if (!document.activeElement) return
    if (!editorContainer.value) return
    if (!editorContainer.value.contains(document.activeElement)) return
    scheduleMilkdownStateSave()
  }

  editorView.dom.addEventListener('keyup', handleKeyUp)
  editorView.dom.addEventListener('mouseup', handleMouseUp)
  editorView.dom.addEventListener('click', handleCheckboxClick, true)

  cleanupFns.push(() => {
    editorView?.dom.removeEventListener('keyup', handleKeyUp)
    editorView?.dom.removeEventListener('mouseup', handleMouseUp)
    editorView?.dom.removeEventListener('click', handleCheckboxClick, true)
  })

  if (editorContainer.value) {
    editorContainer.value.addEventListener('scroll', handleScroll, { passive: true })
    cleanupFns.push(() => {
      editorContainer.value?.removeEventListener('scroll', handleScroll)
    })
  }

  document.addEventListener('selectionchange', handleSelectionChange)
  cleanupFns.push(() => {
    document.removeEventListener('selectionchange', handleSelectionChange)
  })
}

const restoreMilkdownState = async () => {
  if (!editor || !props.path) return

  const stored = loadNoteState(props.path)
  const milkdownState = stored?.milkdown
  if (!milkdownState) return

  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    if (!view) return
    editorView = view

    if (milkdownState.selection) {
      const doc = view.state.doc
      const docSize = doc.content.size
      const clampedFrom = Math.min(Math.max(milkdownState.selection.from, 0), docSize)
      const clampedTo = Math.min(Math.max(milkdownState.selection.to, 0), docSize)
      const tr = view.state.tr.setSelection(TextSelection.create(doc, clampedFrom, clampedTo))
      view.dispatch(tr)
    }
  })

  if (milkdownState.scroll && editorContainer.value) {
    requestAnimationFrame(() => {
      if (editorContainer.value && typeof milkdownState.scroll?.top === 'number') {
        editorContainer.value.scrollTop = milkdownState.scroll.top
      }
    })
  }
}

// Initialize Milkdown editor
onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // Create editor instance
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer.value!)
        ctx.set(defaultValueCtx, props.modelValue)
        ctx.set(remarkStringifyOptionsCtx, customRemarkOptions)

        // Configure listener for content changes
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            handleContentChange(markdown)
          }
        })
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(indent)
      .use(textIndentPlugin)
      .use(milkdownTaskListPlugin)
      .use(listener)
      .create()

    // Apply theme
    updateTheme()
    await focusEditor()
    await setupMilkdownStateListeners()
    await restoreMilkdownState()
  } catch (error) {
    console.error('Failed to initialize Milkdown editor:', error)
  }
})

// Update editor content when modelValue changes externally
watch(() => props.modelValue, async (newValue) => {
  if (!editor || props.disabled) return

  // Only update if content actually changed (avoid infinite loops)
  if (newValue !== currentMarkdown.value) {
    try {
      cleanupMilkdownListeners()
      // Destroy and recreate editor with new content
      editor.destroy()
      editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorContainer.value!)
          ctx.set(defaultValueCtx, newValue)
          ctx.set(remarkStringifyOptionsCtx, customRemarkOptions)

          ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              handleContentChange(markdown)
            }
          })
        })
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(indent)
        .use(textIndentPlugin)
        .use(milkdownTaskListPlugin)
        .use(listener)
        .create()
      
      currentMarkdown.value = newValue
      updateTheme()
      await focusEditor()
      await setupMilkdownStateListeners()
      await restoreMilkdownState()
    } catch (error) {
      console.error('Failed to update editor content:', error)
    }
  }
})

// Watch for theme changes
watch(() => themeStore.isDarkMode, () => {
  updateTheme()
})

watch(() => props.path, async () => {
  saveMilkdownState()
  await setupMilkdownStateListeners()
  await restoreMilkdownState()
})

// Update theme based on dark mode
const updateTheme = () => {
  if (!editorContainer.value) return
  
  // Apply theme class to container
  if (themeStore.isDarkMode) {
    editorContainer.value.classList.add('dark')
    editorContainer.value.classList.remove('light')
  } else {
    editorContainer.value.classList.add('light')
    editorContainer.value.classList.remove('dark')
  }
  
  // Trigger editor update if needed
  if (editor) {
    // Milkdown theme should adapt via CSS variables
    // The nord theme should respect the container classes
  }
}

const handleContainerPointerDown = () => {
  if (props.disabled) return
  void focusEditor()
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }

  cleanupMilkdownListeners()
  
  if (editor) {
    try {
      saveMilkdownState()
      editor.destroy()
    } catch (error) {
      console.error('Error destroying Milkdown editor:', error)
    }
    editor = null
  }
})
</script>

<style scoped>
.milkdown-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  overflow: auto;
}

/* Milkdown editor styles */
.milkdown-editor-container :deep(.milkdown) {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
  padding-top: calc(1rem + 1.5rem);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

.milkdown-editor-container :deep(.milkdown .editor) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.milkdown-editor-container.dark {
  background-color: var(--bg-primary);
}

.milkdown-editor-container.light {
  background-color: var(--bg-primary);
}

.milkdown-editor-container :deep(.milkdown .editor .ProseMirror) {
  flex: 1;
  min-height: 100%;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .milkdown-editor-container {
    min-height: 300px;
  }
  
  .milkdown-editor-container :deep(.milkdown) {
    padding: 0.75rem;
    padding-top: calc(0.75rem + 1.5rem);
    font-size: 14px;
  }
}

/* Ensure editor is editable unless readonly */
.milkdown-editor-container :deep(.milkdown .editor) {
  outline: none;
}

/* Style common markdown elements */
.milkdown-editor-container :deep(.milkdown h1),
.milkdown-editor-container :deep(.milkdown h2),
.milkdown-editor-container :deep(.milkdown h3),
.milkdown-editor-container :deep(.milkdown h4),
.milkdown-editor-container :deep(.milkdown h5),
.milkdown-editor-container :deep(.milkdown h6) {
  color: var(--text-primary);
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0em;
}

.milkdown-editor-container :deep(.milkdown p) {
  margin: 0.125em 0;
  color: var(--text-primary);
}

.milkdown-editor-container :deep(.milkdown code) {
  background-color: var(--bg-secondary);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.milkdown-editor-container :deep(.milkdown pre) {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.milkdown-editor-container :deep(.milkdown pre code) {
  background-color: transparent;
  padding: 0;
}

.milkdown-editor-container :deep(.milkdown blockquote) {
  border-left: 4px solid var(--border-color);
  padding-left: 1rem;
  margin: 1em 0;
  color: var(--text-secondary);
}

.milkdown-editor-container :deep(.milkdown ul),
.milkdown-editor-container :deep(.milkdown ol) {
  margin: 0.125em 0;
  padding-left: 1.5em;
}

.milkdown-editor-container :deep(.milkdown li) {
  margin: 0em 0;
}

.milkdown-editor-container :deep(.milkdown .milkdown-task-item) {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  list-style: none;
  padding-left: 0;
}

.milkdown-editor-container :deep(.milkdown .milkdown-task-checkbox) {
  margin-top: 0.25rem;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.milkdown-editor-container :deep(.milkdown .milkdown-task-item > p:first-of-type) {
  margin: 0;
  flex: 1;
}

.milkdown-editor-container :deep(.milkdown .milkdown-task-item--checked > p:first-of-type) {
  text-decoration: line-through;
  opacity: 0.6;
}

.milkdown-editor-container :deep(.milkdown a) {
  color: #667eea;
  text-decoration: none;
}

.milkdown-editor-container :deep(.milkdown a:hover) {
  text-decoration: underline;
}

.milkdown-editor-container :deep(.milkdown table) {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.milkdown-editor-container :deep(.milkdown th),
.milkdown-editor-container :deep(.milkdown td) {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

.milkdown-editor-container :deep(.milkdown th) {
  background-color: var(--bg-secondary);
  font-weight: 600;
}

/* Task list (checkbox) styles */
.milkdown-editor-container :deep(.milkdown .task-list-item) {
  list-style: none;
  position: relative;
  padding-left: 1.5em;
}

.milkdown-editor-container :deep(.milkdown .task-list-item input[type="checkbox"]) {
  position: absolute;
  left: 0;
  top: 0.3em;
  margin: 0;
  cursor: pointer;
  width: 1em;
  height: 1em;
}

.milkdown-editor-container :deep(.milkdown .task-list-item input[type="checkbox"]:checked) {
  accent-color: #667eea;
}

.milkdown-editor-container :deep(.milkdown .task-list-item > p) {
  margin: 0;
  display: inline;
}

.milkdown-editor-container :deep(.milkdown ul.contains-task-list) {
  padding-left: 0;
}

.milkdown-editor-container :deep(.milkdown ul.contains-task-list > .task-list-item) {
  margin-left: 1.5em;
}
</style>

