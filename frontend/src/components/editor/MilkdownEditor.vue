<template>
  <div
    ref="editorContainer"
    class="milkdown-editor-container"
    @mousedown="handleContainerPointerDown"
    @touchstart="handleContainerPointerDown"
    @contextmenu.prevent="handleContextMenu"
    @paste="handlePaste"
    @drop="handleDrop"
    @dragover.prevent
    @toolbar-action="handleToolbarAction"
  ></div>

  <!-- Context Menu -->
  <ContextMenu
    :is-open="showContextMenu"
    :x="contextMenuX"
    :y="contextMenuY"
    :items="contextMenuItems"
    @close="showContextMenu = false"
    @select="handleContextMenuAction"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
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
import { commonmark, sinkListItemCommand, liftListItemCommand, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand, wrapInBulletListCommand, setBlockTypeCommand } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history'
import { indent, indentConfig } from '@milkdown/plugin-indent'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import type { MilkdownPlugin } from '@milkdown/ctx'
import { $prose } from '@milkdown/utils'
import { TextSelection, type Command, Plugin, PluginKey } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { splitListItem } from '@milkdown/prose/schema-list'
import type { Options } from 'remark-stringify'
import { useThemeStore } from '@/stores/theme'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import { loadNoteState, updateNoteStateSegment } from '@/utils/noteState'
import { milkdownTaskListPlugin } from './plugins/milkdownTaskListPlugin'
import { milkdownImagePlugin } from './plugins/milkdownImagePlugin'
import { apiClient } from '@/api/client'
import { getCurrentDateString } from '@/utils/dateUtils'
import ContextMenu, { type ContextMenuItem } from '@/components/sidebar/ContextMenu.vue'

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
const vaultStore = useVaultStore()
const editorStore = useEditorStore()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Editor | null = null
let editorView: EditorView | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let stateSaveTimeout: ReturnType<typeof setTimeout> | null = null
let currentMarkdown = ref<string>(props.modelValue)
let lastSavedMarkdown = ref<string>(props.modelValue)
const cleanupFns: Array<() => void> = []

// Context menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// Custom remark stringify options to use hyphens for unordered list bullets
const customRemarkOptions: Options = {
  bullet: '-',
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

// Auto-save debounce (1 second)
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

// Command to split task list item (the appendTransaction plugin will ensure new item is unchecked)
const splitTaskListItemCommand: Command = (state, dispatch) => {
  const { selection, schema } = state
  const { $from } = selection
  
  // Find the list item node we're in
  const listItemType = schema.nodes.list_item
  if (!listItemType) return false
  
  // Check if we're in a list item with a checked attribute (task list item)
  let depth = $from.depth
  let listItemNode = null
  
  while (depth > 0) {
    const node = $from.node(depth)
    if (node.type === listItemType && node.attrs.checked != null) {
      listItemNode = node
      break
    }
    depth--
  }
  
  // If we're not in a task list item, let default behavior handle it
  if (!listItemNode) {
    return false
  }
  
  // Split the list item - the appendTransaction plugin will fix the checked state
  return splitListItem(listItemType)(state, dispatch)
}

// Plugin to ensure new task list items are unchecked after Enter
const taskListUncheckPluginKey = new PluginKey('task-list-uncheck')

// ProseMirror plugin to fix new task list items after split
const createTaskListUncheckPlugin = () =>
  new Plugin({
    key: taskListUncheckPluginKey,
    appendTransaction: (transactions, oldState, newState) => {
      // Check if any transaction split a list item
      const schema = newState.schema
      const listItemType = schema.nodes.list_item
      if (!listItemType) return null
      
      // Only process if there were document changes
      const hasChanges = transactions.some(tr => tr.docChanged && tr.steps.length > 0)
      if (!hasChanges) return null
      
      // Check if we're currently in a task list item
      const selection = newState.selection
      const $from = selection.$from
      
      let depth = $from.depth
      let currentItemNode = null
      let currentItemPos = -1
      
      while (depth > 0) {
        const node = $from.node(depth)
        if (node.type === listItemType && node.attrs.checked != null) {
          currentItemNode = node
          currentItemPos = $from.before(depth)
          break
        }
        depth--
      }
      
      if (!currentItemNode || currentItemPos === -1) return null
      
      // Check if this item is newly created by seeing if its position maps back to old state
      // Apply mappings in reverse order to get the original position
      let mappedPos = currentItemPos
      for (let i = transactions.length - 1; i >= 0; i--) {
        const tr = transactions[i]
        if (tr?.mapping) {
          mappedPos = tr.mapping.invert().map(mappedPos, -1)
          if (mappedPos === -1) break
        }
      }
      
      // If position doesn't map back or maps to invalid position, it's a new item
      const isNewItem = mappedPos === -1 || 
                       mappedPos >= oldState.doc.content.size ||
                       !oldState.doc.nodeAt(mappedPos)
      
      if (isNewItem && currentItemNode.attrs.checked !== false && currentItemNode.attrs.checked !== null) {
        // This is a new task list item that needs to be unchecked
        const tr = newState.tr
        tr.setNodeMarkup(currentItemPos, undefined, {
          ...currentItemNode.attrs,
          checked: false
        })
        return tr
      }
      
      return null
    }
  })

// Task list Enter key handler plugin
const taskListEnterPlugin: MilkdownPlugin = (ctx) => {
  return async () => {
    await ctx.wait(KeymapReady)
    const keymapManager = ctx.get(keymapCtx)
    
    const dispose = keymapManager.addObjectKeymap({
      Enter: (state, dispatch) => {
        // Try our custom command first
        if (splitTaskListItemCommand(state, dispatch)) {
          return true
        }
        // Otherwise let default behavior handle it
        return false
      },
    })

    return () => {
      dispose()
    }
  }
}

// ProseMirror plugin wrapper for Milkdown
const taskListUncheckProsePlugin = $prose(() => createTaskListUncheckPlugin())

// History keymap plugin for undo/redo shortcuts
const historyKeymapPlugin: MilkdownPlugin = (ctx) => {
  return async () => {
    await ctx.wait(KeymapReady)
    const keymapManager = ctx.get(keymapCtx)
    const commandManager = ctx.get(commandsCtx)
    const dispose = keymapManager.addObjectKeymap({
      'Mod-z': () => {
        return commandManager.call(undoCommand.key)
      },
      'Mod-r': () => {
        return commandManager.call(redoCommand.key)
      },
      'Mod-y': () => {
        return commandManager.call(redoCommand.key)
      },
      'Mod-s': () => {
        // Manual save with Ctrl+S
        if (props.readonly || props.disabled) return false
        // Immediately save and update last saved markdown
        lastSavedMarkdown.value = currentMarkdown.value
        emit('save', currentMarkdown.value)
        return true
      },
    })

    return () => {
      dispose()
    }
  }
}

// Transform markdown to handle in-progress checkboxes
// GFM doesn't recognize checked: 'in-progress', so it serializes in-progress items as regular bullets
// We need to find in-progress items in the document and convert their markdown representation
const transformMarkdownForInProgress = (markdown: string): string => {
  // editorView should be set when markdownUpdated is called, but if not, we can't transform
  if (!editorView) {
    // Log a warning in development to help debug
    if (process.env.NODE_ENV === 'development') {
      console.warn('transformMarkdownForInProgress: editorView not available, skipping transformation')
    }
    return markdown
  }
  
  const view = editorView
  const lines = markdown.split('\n')
  const { doc } = view.state
  const inProgressItems: Array<{ text: string; lineIndex: number }> = []
  
  // First, find all task list items that are in-progress in the document
  doc.descendants((node, pos) => {
    if ((node.type.name === 'list_item' || node.type.name === 'task_list_item') && node.attrs.checked != null) {
      const state = node.attrs.checked === 'in-progress' ? 'in-progress' : 
                   node.attrs.checked === true ? true : false
      if (state === 'in-progress') {
        const text = node.textContent.trim()
        if (text) {
          // Find the corresponding line in markdown
          // GFM serializes in-progress as a regular bullet (no checkbox), so we need to find lines that:
          // 1. Match the text content
          // 2. Are regular list items (not task list items) OR are task list items with [x]
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            // Match regular list item format: - text or * text or + text (no checkbox)
            const regularListMatch = line.match(/^(\s*[-*+])\s+(.+)$/)
            // Match task list item format: - [x] text or * [x] text or + [x] text
            const taskListMatch = line.match(/^(\s*[-*+])\s+\[x\]\s+(.+)$/)
            
            // Check if this line matches our in-progress item
            if (regularListMatch && regularListMatch[2].trim() === text) {
              // This is a regular bullet that should be a task list item with [>]
              inProgressItems.push({ text, lineIndex: i })
              break
            } else if (taskListMatch && taskListMatch[2].trim() === text) {
              // This is a checked task list item that should be in-progress [>]
              inProgressItems.push({ text, lineIndex: i })
              break
            }
          }
        }
      }
    }
    return true
  })
  
  // Replace regular bullets or [x] with [>] for in-progress items
  inProgressItems.forEach(({ lineIndex }) => {
    if (lines[lineIndex]) {
      const line = lines[lineIndex]
      // Skip if already has [>] (idempotent check)
      if (line.includes('[>]')) {
        return
      }
      // Replace regular bullet format: - text -> - [>] text
      lines[lineIndex] = line.replace(/^(\s*[-*+])\s+(.+)$/, (match, indent, text) => {
        return `${indent} [>] ${text}`
      })
      // Also handle if it's already [x]: - [x] text -> - [>] text
      lines[lineIndex] = lines[lineIndex].replace(/\[x\]/, '[>]')
    }
  })
  
  return lines.join('\n')
}



// Handle content change
const handleContentChange = (markdown: string) => {
  if (props.disabled) return
  
  // Transform markdown to handle in-progress checkboxes
  const transformedMarkdown = transformMarkdownForInProgress(markdown)
  
  // Use the transformed markdown as the canonical version
  const finalMarkdown = transformedMarkdown
  
  // Only emit update if the markdown is different from the current prop value
  // This prevents save loops when the markdown hasn't actually changed
  if (finalMarkdown !== props.modelValue) {
    currentMarkdown.value = finalMarkdown
    // Emit update for v-model
    emit('update:modelValue', finalMarkdown)
    
    // Debounced auto-save
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    saveTimeout = setTimeout(() => {
      if (props.disabled) return
      
      // Only save if content has changed since last save
      if (currentMarkdown.value !== lastSavedMarkdown.value) {
        lastSavedMarkdown.value = currentMarkdown.value
        emit('save', currentMarkdown.value)
      }
    }, AUTO_SAVE_DELAY)
  } else {
    // Markdown matches the prop value, just update currentMarkdown to prevent watch from triggering
    currentMarkdown.value = finalMarkdown
  }
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

      if (node.type.name === 'task_list_item' || node.type.name === 'list_item') {
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
      if (node && (node.type.name === 'task_list_item' || node.type.name === 'list_item') && node.attrs.checked != null) {
        // Cycle through states: unchecked -> in-progress -> checked -> unchecked
        const currentState = node.attrs.checked
        let newState: false | 'in-progress' | true
        
        if (currentState === false || currentState === null || currentState === undefined) {
          newState = 'in-progress'
        } else if (currentState === 'in-progress') {
          newState = true
        } else {
          newState = false
        }
        
        const newAttrs = { ...node.attrs, checked: newState }
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

// Transform image URLs in markdown to use API endpoint
const transformImageUrls = (markdown: string): string => {
  // Transform image references like ![alt](/_resources/image.png) to use API endpoint
  return markdown.replace(
    /!\[([^\]]*)\]\((\/_resources\/[^)]+)\)/g,
    (match, alt, path) => {
      // Extract filename from path
      const filename = path.replace('/_resources/', '')
      return `![${alt}](/api/v1/images/${filename})`
    }
  )
}

// Pre-process markdown to convert [>] to [x] so GFM parser recognizes it as a task list item
// We'll convert it back to [>] after parsing and setting the in-progress state
const preprocessMarkdownForParsing = (markdown: string): string => {
  // Convert [>] to [x] temporarily so GFM parser recognizes it as a task list item
  return markdown.replace(/\[>\]/g, '[x]')
}

// Update task list items in the editor to set in-progress state for [>] checkboxes
// Since we pre-process [>] to [x] before parsing, all [>] items become checked task list items
// We need to find which checked items correspond to [>] in the original markdown
const updateInProgressCheckboxes = async (originalMarkdown: string) => {
  if (!editor || !editorView) return
  
  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    if (!view) return
    
    const { doc, tr } = view.state
    const lines = originalMarkdown.split('\n')
    
    // Find all lines with [>] checkboxes and extract their text content
    const inProgressItems: Array<{ lineIndex: number; text: string }> = []
    lines.forEach((line, index) => {
      const match = line.match(/^\s*[-*+]\s+\[>\]\s+(.+)$/)
      if (match) {
        inProgressItems.push({
          lineIndex: index,
          text: match[1].trim()
        })
      }
    })
    
    if (inProgressItems.length === 0) return
    
    // Find corresponding task list items in the document and update them
    // Since we pre-processed [>] to [x], these should be checked task list items
    let updated = false
    
    doc.descendants((node, pos) => {
      if ((node.type.name === 'list_item' || node.type.name === 'task_list_item') && 
          node.attrs.checked === true) {
        // This is a checked task list item - check if it should be in-progress
        const nodeText = node.textContent.trim()
        
        // Find matching in-progress item by text content
        for (const item of inProgressItems) {
          if (item.text === nodeText || lines[item.lineIndex].includes(nodeText)) {
            // This checked item should be in-progress
            if (node.attrs.checked !== 'in-progress') {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                checked: 'in-progress'
              })
              updated = true
            }
            break
          }
        }
      }
      return true
    })
    
    if (updated) {
      view.dispatch(tr)
    }
  })
}

// Initialize Milkdown editor
onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // Transform image URLs before initializing editor
    let transformedContent = transformImageUrls(props.modelValue)
    // Pre-process markdown to convert [/] to [x] so GFM parser recognizes it as a task list item
    transformedContent = preprocessMarkdownForParsing(transformedContent)
    // Create editor instance
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer.value!)
        ctx.set(defaultValueCtx, transformedContent)
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
      .use(history)
      .use(historyKeymapPlugin)
      .use(textIndentPlugin)
      .use(taskListEnterPlugin)
      .use(taskListUncheckProsePlugin)
      .use(milkdownTaskListPlugin)
      .use(milkdownImagePlugin)
      .use(listener)
      .create()

    // Apply theme
    updateTheme()
    await focusEditor()
    await setupMilkdownStateListeners()
    await restoreMilkdownState()
    // Update in-progress checkboxes from markdown
    // Use a small delay to ensure editor is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100))
    await updateInProgressCheckboxes(props.modelValue)
    

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
      // Set currentMarkdown before creating editor to prevent race conditions
      // This ensures handleContentChange can compare correctly
      currentMarkdown.value = newValue
      // Update last saved markdown when note content changes externally
      lastSavedMarkdown.value = newValue
      
      // Transform image URLs before loading into editor
      let transformedContent = transformImageUrls(newValue)
      // Pre-process markdown to convert [/] to [x] so GFM parser recognizes it as a task list item
      transformedContent = preprocessMarkdownForParsing(transformedContent)
      // Destroy and recreate editor with new content
      editor.destroy()
      editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorContainer.value!)
          ctx.set(defaultValueCtx, transformedContent)
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
        .use(history)
        .use(historyKeymapPlugin)
        .use(textIndentPlugin)
        .use(taskListEnterPlugin)
        .use(taskListUncheckProsePlugin)
        .use(milkdownTaskListPlugin)
        .use(milkdownImagePlugin)
        .use(listener)
        .create()
      
      updateTheme()
      await focusEditor()
      await setupMilkdownStateListeners()
      await restoreMilkdownState()
      // Update in-progress checkboxes from markdown
      // Use a small delay to ensure editor is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100))
      await updateInProgressCheckboxes(newValue)
      
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
  vaultStore.collapseSidebarIfNotPinned()
  void focusEditor()
}

const handlePaste = async (event: ClipboardEvent) => {
  if (props.disabled || props.readonly || !editor) return

  const items = event.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()

      try {
        const file = item.getAsFile()
        if (file) {
          const imagePath = await apiClient.uploadImage(file)
          await insertImageAtCursor(imagePath, file.name)
        }
      } catch (error) {
        console.error('Failed to upload pasted image:', error)
      }
      break // Only handle the first image
    }
  }
}

const handleDrop = async (event: DragEvent) => {
  if (props.disabled || props.readonly || !editor) return

  event.preventDefault()

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      try {
        const imagePath = await apiClient.uploadImage(file)
        await insertImageAtCursor(imagePath, file.name)
      } catch (error) {
        console.error('Failed to upload dropped image:', error)
      }
      break // Only handle the first image
    }
  }
}

const insertImageAtCursor = async (imagePath: string, filename: string) => {
  if (!editor) return

  const altText = filename.replace(/\.[^/.]+$/, '') // Remove extension for alt text

  // Convert image path to API endpoint URL
  // Backend returns paths like "/_resources/image.png"
  // We need to convert to "/api/v1/images/_resources/image.png"
  let imageUrl = imagePath
  if (imagePath.startsWith('/_resources/')) {
    // Extract just the filename from the path
    const filename = imagePath.replace('/_resources/', '')
    imageUrl = `/api/v1/images/${filename}`
  } else if (imagePath.startsWith('_resources/')) {
    imageUrl = `/api/v1/images/${imagePath}`
  }

  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state, dispatch } = view
    const { schema, selection } = state

    // Get the image node type from the schema
    const imageType = schema.nodes.image
    if (!imageType) {
      // Fallback: insert as markdown text if image node type not available
      const imageMarkdown = `![${altText}](${imageUrl})`
      const tr = state.tr.insertText(imageMarkdown)
      dispatch(tr)
      return
    }

    // Create an image node with the URL and alt text
    const imageNode = imageType.create({
      src: imageUrl,
      alt: altText,
    })

    // Insert the image node at the current cursor position
    const tr = state.tr.replaceSelectionWith(imageNode)
    dispatch(tr)
  })
}

// Context menu handlers
const handleContextMenu = (event: MouseEvent) => {
  if (props.disabled || props.readonly) return

  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

const contextMenuItems = computed((): ContextMenuItem[] => {
  return [
    { label: 'Insert Date', icon: '📅', action: 'insert-date' }
  ]
})

const handleContextMenuAction = (action: string) => {
  switch (action) {
    case 'insert-date':
      insertDateAtCursor()
      break
  }
}

const insertDateAtCursor = async () => {
  if (!editor || props.disabled || props.readonly) return

  const dateStr = getCurrentDateString()

  await editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { state, dispatch } = view
    const { selection } = state

    // Insert the date string at the current cursor position
    const tr = state.tr.insertText(dateStr, selection.from, selection.to)
    dispatch(tr)
  })
}

const handleToolbarAction = async (event: CustomEvent) => {
  if (!editor || props.disabled || props.readonly) return

  const { command } = event.detail
  if (!command) return

  await editor.action((ctx) => {
    const commandManager = ctx.get(commandsCtx)

    // Execute the appropriate command based on the toolbar action
    switch (command) {
      case 'ToggleBold':
        return commandManager.call(toggleStrongCommand.key)
      case 'ToggleItalic':
        return commandManager.call(toggleEmphasisCommand.key)
      case 'TurnIntoH2':
        return commandManager.call(wrapInHeadingCommand.key, { level: 2 })
      case 'WrapInBulletList':
        return commandManager.call(wrapInBulletListCommand.key)
      case 'TurnIntoCodeFence':
        return commandManager.call(setBlockTypeCommand.key, { type: 'code_block' })
      case 'Undo':
        return commandManager.call(undoCommand.key)
      case 'Redo':
        return commandManager.call(redoCommand.key)
    }
  })
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (stateSaveTimeout) {
    clearTimeout(stateSaveTimeout)
  }
  
  cleanupMilkdownListeners()
  
  if (editor) {
    try {
      // Save state one last time before destroying
      if (props.path && editorView) {
        saveMilkdownState()
      }
      editor.destroy()
    } catch (error) {
      console.error('Error destroying Milkdown editor:', error)
    }
    editor = null
    editorView = null
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
  overflow: visible;
}

/* Milkdown editor styles */
.milkdown-editor-container :deep(.milkdown) {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
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

.milkdown-editor-container :deep(.milkdown hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 1.5em 0;
  height: 0;
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

/* In-progress checkbox styling - green box with yellow arrow */
.milkdown-editor-container :deep(.milkdown input[type="checkbox"][data-task-state="in-progress"]),
.milkdown-editor-container :deep(.milkdown .task-list-item input[type="checkbox"][data-task-state="in-progress"]),
.milkdown-editor-container :deep(.milkdown .milkdown-task-checkbox[data-task-state="in-progress"]) {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 1rem;
  height: 1rem;
  min-width: 1rem;
  min-height: 1rem;
  border: 2px solid #22c55e;
  background-color: #22c55e;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
  flex-shrink: 0;
}

.milkdown-editor-container :deep(.milkdown input[type="checkbox"][data-task-state="in-progress"]::after),
.milkdown-editor-container :deep(.milkdown .task-list-item input[type="checkbox"][data-task-state="in-progress"]::after),
.milkdown-editor-container :deep(.milkdown .milkdown-task-checkbox[data-task-state="in-progress"]::after) {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-left: 6px solid #fbbf24;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  margin-left: 1px;
}

.milkdown-editor-container :deep(.milkdown .task-list-item > p) {
  margin: 0;
  display: inline;
}

/* In-progress text color */
.milkdown-editor-container.dark :deep(.milkdown .milkdown-task-item--in-progress > p:first-of-type),
.milkdown-editor-container.dark :deep(.milkdown .task-list-item.milkdown-task-item--in-progress > p) {
  color: #4ade80; /* bright green for dark mode */
}

.milkdown-editor-container.light :deep(.milkdown .milkdown-task-item--in-progress > p:first-of-type),
.milkdown-editor-container.light :deep(.milkdown .task-list-item.milkdown-task-item--in-progress > p) {
  color: #16a34a; /* darker green for light mode */
}

/* Fix checkbox jumping and right-shift */
.milkdown-editor-container :deep(.milkdown .task-list-item) {
  list-style: none;
  position: relative;
  padding-left: 0 !important;
}

.milkdown-editor-container :deep(.milkdown .task-list-item > input[type="checkbox"]) {
  position: absolute;
  left: 0;
  top: 0.35em;
  margin: 0;
}

.milkdown-editor-container :deep(.milkdown .task-list-item > label) {
  display: block;
  margin-left: 1.8em;        /* space for checkbox + gap */
  min-height: 1.5em;
}

.milkdown-editor-container :deep(.milkdown ul.contains-task-list) {
  padding-left: 1.5em;
}

.milkdown-editor-container :deep(.milkdown ul ul.contains-task-list) {
  padding-left: 1.5em;       /* consistent nesting */
}

.milkdown-editor-container :deep(.milkdown ul.contains-task-list) {
  padding-left: 0;
}

.milkdown-editor-container :deep(.milkdown ul.contains-task-list > .task-list-item) {
  margin-left: 1.5em;
}

/* Image resize styles */
.milkdown-editor-container :deep(.milkdown .image-wrapper) {
  position: relative;
  display: inline-block;
  margin: 8px 0;
  cursor: pointer;
}

.milkdown-editor-container :deep(.milkdown .image-wrapper img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.milkdown-editor-container :deep(.milkdown .image-wrapper.ProseMirror-selectednode) {
  outline: 2px solid #007acc;
  outline-offset: 2px;
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle) {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #007acc;
  border: 2px solid white;
  border-radius: 50%;
  z-index: 1000;
  pointer-events: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle-nw) {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle-ne) {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle-sw) {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle-se) {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

.milkdown-editor-container :deep(.milkdown .image-resize-handle:hover) {
  background-color: #005a9e;
  transform: scale(1.2);
}
</style>

