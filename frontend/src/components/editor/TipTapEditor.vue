<template>
  <div class="tiptap-editor-container">
    <TipTapToolbar :editor="editor || null" />
    <editor-content :editor="editor" class="tiptap-editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { defaultMarkdownSerializer } from 'prosemirror-markdown'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { DOMParser } from '@tiptap/pm/model'
import { marked } from 'marked'
import TipTapToolbar from './TipTapToolbar.vue'

// Props
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
}>()

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isUpdatingFromEditor = false
let lastEmittedContent = ''
let isSettingContent = false

// Debounce delay for auto-save (1 second) - same as Monaco
const AUTO_SAVE_DELAY = 1000

// Custom Tab Extension for indentation
const TabExtension = Extension.create({
  name: 'tabHandler',
  
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection
        
        // Check if we're in a list
        if ($from.parent.type.name === 'listItem' || $from.parent.type.name === 'taskItem') {
          // Try to sink list items (indent)
          if (this.editor.commands.sinkListItem('listItem')) {
            return true
          }
          if (this.editor.commands.sinkListItem('taskItem')) {
            return true
          }
        }
        
        // If not in a list, insert tab character (4 spaces)
        return this.editor.commands.insertContent('    ')
      },
      'Shift-Tab': () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection
        
        // Check if we're in a list
        if ($from.parent.type.name === 'listItem' || $from.parent.type.name === 'taskItem') {
          // Try to lift list items (outdent)
          if (this.editor.commands.liftListItem('listItem')) {
            return true
          }
          if (this.editor.commands.liftListItem('taskItem')) {
            return true
          }
        }
        
        // For regular text, remove up to 4 spaces before cursor
        const { $anchor } = selection
        const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset)
        const match = textBefore.match(/[ ]{1,4}$/)
        
        if (match) {
          const from = $anchor.pos - match[0].length
          const to = $anchor.pos
          return this.editor.commands.deleteRange({ from, to })
        }
        
        return false
      },
    }
  },
})

// Configure marked for GFM (GitHub Flavored Markdown) support
marked.setOptions({
  gfm: true,
  breaks: true,
})

// Helper function to convert markdown to HTML for TipTap
const markdownToHtml = async (markdown: string): Promise<string> => {
  // Use marked to convert markdown to HTML
  let html = await marked.parse(markdown)
  
  // Convert task list items to TipTap format
  html = html.replace(
    /<li>\s*<input\s+(?:checked\s+)?(?:disabled\s+)?type="checkbox"(?:\s+checked)?(?:\s+disabled)?>\s*(.+?)<\/li>/gi,
    (match, content) => {
      const checked = match.includes('checked')
      return `<li data-type="taskItem" data-checked="${checked}">${content}</li>`
    }
  )
  
  // Wrap task lists in proper container
  html = html.replace(
    /<ul>\s*(<li data-type="taskItem"[\s\S]*?<\/li>\s*)+<\/ul>/gi,
    (match) => {
      return match.replace('<ul>', '<ul data-type="taskList">')
    }
  )
  
  return html
}

// Helper function to normalize markdown for comparison
const normalizeMarkdown = (markdown: string): string => {
  return markdown
    .trim() // Remove leading/trailing whitespace
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
}

// Helper function to convert TipTap content to markdown
const editorToMarkdown = (node: ProseMirrorNode): string => {
  // Custom serialization for task lists
  const serialize = (node: ProseMirrorNode): string => {
    let markdown = ''
    
    node.forEach((child) => {
      if (child.type.name === 'taskList') {
        child.forEach((taskItem) => {
          const checked = taskItem.attrs.checked ? 'x' : ' '
          markdown += `- [${checked}] `
          taskItem.forEach((content) => {
            markdown += serialize(content)
          })
          markdown += '\n'
        })
      } else if (child.type.name === 'paragraph') {
        child.forEach((inline) => {
          if (inline.isText) {
            markdown += inline.text
          }
        })
        markdown += '\n\n'
      } else if (child.type.name === 'heading') {
        const level = child.attrs.level
        markdown += '#'.repeat(level) + ' '
        child.forEach((inline) => {
          if (inline.isText) {
            markdown += inline.text
          }
        })
        markdown += '\n\n'
      } else if (child.type.name === 'bulletList') {
        child.forEach((listItem) => {
          markdown += '- '
          listItem.forEach((content) => {
            markdown += serialize(content).trim()
          })
          markdown += '\n'
        })
      } else if (child.type.name === 'orderedList') {
        let index = 1
        child.forEach((listItem) => {
          markdown += `${index}. `
          listItem.forEach((content) => {
            markdown += serialize(content).trim()
          })
          markdown += '\n'
          index++
        })
      } else if (child.type.name === 'codeBlock') {
        markdown += '```\n'
        child.forEach((inline) => {
          if (inline.isText) {
            markdown += inline.text
          }
        })
        markdown += '\n```\n\n'
      } else if (child.type.name === 'blockquote') {
        child.forEach((content) => {
          const lines = serialize(content).split('\n')
          lines.forEach(line => {
            if (line) markdown += '> ' + line + '\n'
          })
        })
      } else {
        markdown += serialize(child)
      }
    })
    
    return markdown
  }
  
  return serialize(node).trim()
}

// Initialize TipTap editor
const editor = useEditor({
  content: '',
  editable: !props.readonly,
  extensions: [
    StarterKit,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Placeholder.configure({
      placeholder: 'Start writing...',
    }),
    TabExtension,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    // Don't emit if we're programmatically setting content
    if (isSettingContent) {
      return
    }
    
    // Get markdown content from editor
    const markdown = editorToMarkdown(editor.state.doc)
    
    // Normalize for comparison
    const normalizedMarkdown = normalizeMarkdown(markdown)
    const normalizedLast = normalizeMarkdown(lastEmittedContent)
    
    // Only emit if content actually changed
    if (normalizedMarkdown === normalizedLast) {
      return
    }
    
    // Emit update for v-model
    isUpdatingFromEditor = true
    lastEmittedContent = markdown
    emit('update:modelValue', markdown)
    
    // Reset flag after a short delay to allow watcher to process
    setTimeout(() => {
      isUpdatingFromEditor = false
    }, 10) // Increased from 0 to 10ms for better async handling
    
    // Debounced auto-save
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    saveTimeout = setTimeout(() => {
      emit('save', markdown)
    }, AUTO_SAVE_DELAY)
  },
})

// Watch for external content changes (from Monaco editor or parent component)
watch(() => props.modelValue, async (newValue) => {
  // Don't update if this change came from the editor itself
  if (!editor.value || isUpdatingFromEditor || isSettingContent) {
    return
  }

  // Get current editor content as markdown
  const currentMarkdown = editorToMarkdown(editor.value.state.doc)
  
  // Normalize for comparison
  const normalizedNew = normalizeMarkdown(newValue)
  const normalizedCurrent = normalizeMarkdown(currentMarkdown)
  const normalizedLast = normalizeMarkdown(lastEmittedContent)
  
  // Only update if content actually changed (using normalized comparison)
  if (normalizedNew !== normalizedCurrent && normalizedNew !== normalizedLast) {
    // Set flag to prevent onUpdate from firing
    isSettingContent = true
    
    try {
      // Convert markdown to HTML and set content
      const html = await markdownToHtml(newValue)
      lastEmittedContent = newValue // Update our tracking
      editor.value.commands.setContent(html)
    } finally {
      // Reset flag after content is set
      setTimeout(() => {
        isSettingContent = false
      }, 10)
    }
  }
})

// Initialize content from markdown on mount
watch(editor, async (newEditor) => {
  if (newEditor && props.modelValue) {
    isSettingContent = true
    try {
      const html = await markdownToHtml(props.modelValue)
      lastEmittedContent = props.modelValue // Track initial content
      newEditor.commands.setContent(html)
    } finally {
      setTimeout(() => {
        isSettingContent = false
      }, 10)
    }
  }
}, { immediate: true })

// Watch for readonly changes
watch(() => props.readonly, (newReadonly) => {
  if (editor.value) {
    editor.value.setEditable(!newReadonly)
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
.tiptap-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: white;
}

.tiptap-editor {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* TipTap Editor Styles */
:deep(.tiptap) {
  outline: none;
  min-height: 100%;
}

/* Heading styles */
:deep(.tiptap h1) {
  font-size: 2em;
  font-weight: bold;
  margin-top: 0.67em;
  margin-bottom: 0.67em;
  line-height: 1.2;
}

:deep(.tiptap h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin-top: 0.75em;
  margin-bottom: 0.75em;
  line-height: 1.3;
}

:deep(.tiptap h3) {
  font-size: 1.17em;
  font-weight: bold;
  margin-top: 0.83em;
  margin-bottom: 0.83em;
  line-height: 1.4;
}

/* Paragraph spacing */
:deep(.tiptap p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  line-height: 1.6;
}

/* List styles */
:deep(.tiptap ul),
:deep(.tiptap ol) {
  padding-left: 1.5rem;
  margin: 0.5em 0;
}

:deep(.tiptap li) {
  margin: 0.25em 0;
}

/* Code styles */
:deep(.tiptap code) {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875em;
}

:deep(.tiptap pre) {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(.tiptap pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

/* Blockquote styles */
:deep(.tiptap blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin: 1em 0;
  color: #6b7280;
  font-style: italic;
}

/* Task list styles with proper checkbox alignment */
:deep(.tiptap ul[data-type="taskList"]) {
  list-style: none;
  padding: 0;
  margin: 0.5em 0;
}

:deep(.tiptap ul[data-type="taskList"] li) {
  display: flex;
  align-items: center;
  margin: 0.25em 0;
}

:deep(.tiptap ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
  cursor: pointer;
}

:deep(.tiptap ul[data-type="taskList"] li > label input[type="checkbox"]) {
  cursor: pointer;
  width: 1rem;
  height: 1rem;
}

:deep(.tiptap ul[data-type="taskList"] li > div) {
  flex: 1;
  line-height: 1.6;
}

/* Nested task lists */
:deep(.tiptap ul[data-type="taskList"] ul[data-type="taskList"]) {
  margin-left: 1.5rem;
  margin-top: 0.25em;
}

/* Placeholder styles */
:deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* Link styles */
:deep(.tiptap a) {
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.tiptap a:hover) {
  color: #5a67d8;
}

/* Horizontal rule */
:deep(.tiptap hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 2em 0;
}

/* Bold and italic */
:deep(.tiptap strong) {
  font-weight: bold;
}

:deep(.tiptap em) {
  font-style: italic;
}

/* Strike through */
:deep(.tiptap s) {
  text-decoration: line-through;
}
</style>

