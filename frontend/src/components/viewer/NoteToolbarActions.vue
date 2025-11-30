<template>
  <div class="note-toolbar-actions">
    <!-- Left section: Editor actions (only for milkdown editor) -->
    <div class="editor-actions" v-if="isUsingMilkdown">
      <button
        v-for="action in editorActions"
        :key="action.id"
        class="action-btn"
        @click="action.onClick"
        :title="action.label"
      >
        {{ action.icon }}
      </button>
    </div>

    <!-- Left section: Word wrap toggle (only for codemirror editor) -->
    <div class="editor-actions" v-if="!isUsingMilkdown && isMarkdownFile">
      <button
        class="action-btn"
        @click="toggleWordWrap"
        :title="wordWrapTitle"
      >
        {{ wordWrapIcon }}
      </button>
    </div>

    <!-- Right section: Editor toggle and search -->
    <div class="toolbar-actions-right">
      <!-- Editor toggle (only for markdown files) -->
      <button
        v-if="isMarkdownFile"
        class="editor-toggle-btn"
        @click="toggleEditor"
        :title="editorToggleTitle"
      >
        <span class="editor-icon">{{ editorIcon }}</span>
      </button>

      <!-- Search button -->
      <button
        class="search-btn"
        @click="openSearch"
        title="Search (Ctrl+P)"
      >
        <span class="search-icon">🔍</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'

// Props
interface Props {
  filePath?: string
}

const props = withDefaults(defineProps<Props>(), {
  filePath: ''
})

// Emits
const emit = defineEmits<{
  'openSearch': []
  'toggleWordWrap': []
}>()

// Store
const editorStore = useEditorStore()

// Types
interface EditorAction {
  id: string
  icon: string
  label: string
  onClick: () => void
  shortcut?: string
  hideOnMobile?: boolean
}

// Computed
const isMarkdownFile = computed(() => {
  return props.filePath?.endsWith('.md') || false
})

const isUsingMilkdown = computed(() => {
  return isMarkdownFile.value && editorStore.markdownEditor === 'milkdown'
})

// Editor toggle
const toggleEditor = () => {
  editorStore.toggleMarkdownEditor()
}

const editorIcon = computed(() => {
  return editorStore.markdownEditor === 'milkdown' ? '✏️' : '📝'
})

const editorToggleTitle = computed(() => {
  return editorStore.markdownEditor === 'milkdown'
    ? 'Switch to CodeMirror Editor'
    : 'Switch to Milkdown Editor'
})

// Search
const openSearch = () => {
  emit('openSearch')
}

// Word wrap toggle
const wordWrapIcon = computed(() => {
  return '↩️'
})

const wordWrapTitle = computed(() => {
  return 'Toggle Word Wrap'
})

const toggleWordWrap = () => {
  emit('toggleWordWrap')
}

// Editor actions for markdown files
const editorActions = computed<EditorAction[]>(() => {
  return [
    {
      id: 'bold',
      icon: 'B',
      label: 'Bold (Ctrl+B)',
      onClick: () => executeEditorCommand('ToggleBold'),
      shortcut: 'Ctrl+B'
    },
    {
      id: 'italic',
      icon: 'I',
      label: 'Italic (Ctrl+I)',
      onClick: () => executeEditorCommand('ToggleItalic'),
      shortcut: 'Ctrl+I'
    },
    {
      id: 'heading',
      icon: 'H',
      label: 'Heading',
      onClick: () => executeEditorCommand('TurnIntoH2')
    },
    {
      id: 'bullet-list',
      icon: '•',
      label: 'Bullet List',
      onClick: () => executeEditorCommand('WrapInBulletList')
    },
    {
      id: 'code-block',
      icon: '</>',
      label: 'Code Block',
      onClick: () => executeEditorCommand('TurnIntoCodeFence')
    }
  ]
})

// Execute editor command by finding the active Milkdown editor
const executeEditorCommand = (commandName: string) => {
  // Find the active Milkdown editor in the DOM
  const milkdownEditor = document.querySelector('.milkdown-editor-container .milkdown .editor .ProseMirror') as HTMLElement
  if (!milkdownEditor) return

  // Create and dispatch a custom event that the MilkdownEditor can listen to
  const event = new CustomEvent('toolbar-action', {
    detail: { command: commandName },
    bubbles: true
  })
  milkdownEditor.dispatchEvent(event)
}
</script>

<style scoped>
.note-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.75rem;
  gap: 0.5rem;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.toolbar-actions-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow);
}

.action-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:active {
  transform: scale(0.95);
}

.editor-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow);
}

.editor-toggle-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.editor-toggle-btn:active {
  transform: scale(0.98);
}

.editor-icon {
  font-size: 0.85rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow);
}

.search-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.search-btn:active {
  transform: scale(0.98);
}

.search-icon {
  font-size: 0.85rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icon normalization for consistent alignment */
.editor-icon,
.search-icon {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-variant-emoji: text;
  vertical-align: middle;
}

/* Responsive design */
@media (max-width: 768px) {
  .note-toolbar-actions {
    padding: 0.25rem 0.5rem;
  }

  .action-btn,
  .editor-toggle-btn,
  .search-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.125rem;
  }

  .editor-icon,
  .search-icon {
    font-size: 1.125rem;
  }
}
</style>