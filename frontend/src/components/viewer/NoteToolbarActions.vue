<template>
  <div class="note-toolbar-actions">
    <!-- Left section: Editor actions (only for markdown) -->
    <div class="editor-actions" v-if="isMarkdownFile">
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

// Editor actions for markdown files
const editorActions = computed<EditorAction[]>(() => {
  // For now, return empty array - will implement actual actions in Phase 3
  return []
})
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