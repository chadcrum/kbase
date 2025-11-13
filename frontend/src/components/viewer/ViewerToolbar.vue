<template>
  <div class="viewer-toolbar" :style="{ '--toolbar-left': toolbarLeft }">
    <!-- Sidebar toggle at far left -->
    <button class="sidebar-toggle-btn" @click="toggleSidebar" :title="sidebarToggleTitle">
      <span class="toggle-icon">{{ sidebarToggleIcon }}</span>
    </button>

    <div class="toolbar-center">
      <!-- File path (smaller title) -->
      <span v-if="filePath" class="file-path">{{ filePath }}</span>
    </div>

    <div class="toolbar-right">
      <!-- Editor toggle for markdown files -->
      <button
        v-if="isMarkdownFile"
        class="editor-toggle-btn"
        @click="toggleEditor"
        :title="editorToggleTitle"
      >
        <span class="editor-icon">{{ editorIcon }}</span>
      </button>

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

// Toolbar left position based on sidebar state
const toolbarLeft = computed(() => {
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})
</script>

<style scoped>
.viewer-toolbar {
  position: fixed;
  top: var(--tabs-bar-height);
  left: var(--toolbar-left);
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--pane-toolbar-padding-y) var(--pane-toolbar-padding-x);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  min-height: var(--pane-toolbar-height);
  gap: 1rem;
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 1px 0 var(--border-color-subtle);
  flex-shrink: 0;
  touch-action: none;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: #667eea;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px var(--shadow);
  margin-right: 0.75rem;
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

.file-path {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
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


.toolbar-right {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
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
  .viewer-toolbar {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  
  .sidebar-toggle-btn {
    order: 1;
    margin-right: 0.5rem;
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
}
</style>

