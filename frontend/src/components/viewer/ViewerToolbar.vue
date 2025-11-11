<template>
  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <button class="sidebar-toggle-btn" @click="toggleSidebar" :title="sidebarToggleTitle">
        <span class="toggle-icon">{{ sidebarToggleIcon }}</span>
      </button>
      <div class="file-info">
        <h2 class="file-name">{{ fileName }}</h2>
        <span v-if="filePath" class="file-path">{{ filePath }}</span>
      </div>
    </div>
    
    <div class="toolbar-center">
      <!-- Editor toggle for markdown files -->
      <button
        v-if="isMarkdownFile"
        class="editor-toggle-btn"
        @click="toggleEditor"
        :title="editorToggleTitle"
      >
        <span class="editor-icon">{{ editorIcon }}</span>
        <span class="editor-text">{{ editorText }}</span>
      </button>
    </div>
    
    <div class="toolbar-right">
      <button class="search-btn" @click="openSearch" title="Search (Ctrl+P)">
        <span class="search-icon">🔍</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'

// Store
const vaultStore = useVaultStore()
const editorStore = useEditorStore()

// Props
interface Props {
  fileName: string
  filePath?: string
}

const props = withDefaults(defineProps<Props>(), {
  filePath: ''
})

// Emits
const emit = defineEmits<{
  'openSearch': []
}>()

// Methods
const openSearch = () => {
  emit('openSearch')
}

const toggleSidebar = () => {
  vaultStore.toggleSidebar()
}

// Computed
const sidebarToggleIcon = computed(() => {
  return vaultStore.isSidebarCollapsed ? '»' : '«'
})

const sidebarToggleTitle = computed(() => {
  return vaultStore.isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'
})

// Editor toggle
const isMarkdownFile = computed(() => {
  return props.filePath?.endsWith('.md') || false
})

const toggleEditor = () => {
  editorStore.toggleMarkdownEditor()
}

const editorIcon = computed(() => {
  return editorStore.markdownEditor === 'milkdown' ? '✏️' : '📝'
})

const editorText = computed(() => {
  return editorStore.markdownEditor === 'milkdown' ? 'Milkdown' : 'Monaco'
})

const editorToggleTitle = computed(() => {
  return editorStore.markdownEditor === 'milkdown'
    ? 'Switch to Monaco Editor'
    : 'Switch to Milkdown Editor'
})
</script>

<style scoped>
.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(to bottom, var(--bg-primary), var(--bg-tertiary));
  border-bottom: 1px solid var(--border-color);
  min-height: 60px;
  gap: 1rem;
  transition: background 0.3s ease, border-color 0.3s ease;
}

.toolbar-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 1.25rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px var(--shadow);
}

.sidebar-toggle-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.sidebar-toggle-btn:active {
  transform: scale(0.95);
}

.toggle-icon {
  line-height: 1;
  font-weight: bold;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-center {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
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

.editor-text {
  font-weight: 500;
  white-space: nowrap;
}

.toolbar-right {
  flex: 0 0 auto;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-end;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
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
  .viewer-toolbar {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  
  .toolbar-left {
    flex: 1 1 100%;
    order: 1;
    gap: 0.5rem;
  }
  
  .toolbar-center {
    order: 3;
    flex: 1 1 100%;
    display: flex;
    justify-content: center;
  }
  
  .toolbar-right {
    order: 2;
    gap: 0.25rem;
  }
  
  .file-path {
    display: none;
  }
  
  .file-name {
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100vw - 260px); /* Account for sidebar width when open */
  }
}
</style>

