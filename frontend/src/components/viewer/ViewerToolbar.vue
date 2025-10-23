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
      <div class="view-toggle">
        <button
          class="toggle-btn"
          @click="toggleViewMode"
          :title="viewMode === 'editor' ? 'Switch to Markdown' : 'Switch to Code'"
        >
          <span class="icon-text">{{ viewMode === 'wysiwyg' ? 'Md' : '</>'}}</span>
        </button>
      </div>
    </div>
    
    <div class="toolbar-right">
      <button class="search-btn" @click="openSearch" title="Search (Ctrl+P)">
        <span class="search-icon">🔍</span>
        <span class="search-text">Search</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '@/stores/vault'

// Store
const vaultStore = useVaultStore()

// Props
interface Props {
  fileName: string
  filePath?: string
  viewMode: 'editor' | 'wysiwyg'
}

const props = withDefaults(defineProps<Props>(), {
  filePath: ''
})

// Emits
const emit = defineEmits<{
  'update:viewMode': [mode: 'editor' | 'wysiwyg']
  'openSearch': []
}>()

// Methods
const toggleViewMode = () => {
  const newMode = props.viewMode === 'editor' ? 'wysiwyg' : 'editor'
  emit('update:viewMode', newMode)
}

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
</script>

<style scoped>
.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  min-height: 60px;
  gap: 1rem;
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
  border: 1px solid #e2e8f0;
  background: white;
  color: #667eea;
  font-size: 1.25rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  color: #1f2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-center {
  flex: 0 0 auto;
}

.view-toggle {
  display: flex;
  gap: 0;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #667eea;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-width: 56px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.toggle-btn:active {
  transform: scale(0.98);
}

.toggle-btn .icon-text {
  font-size: 1.125rem;
  line-height: 1;
  font-weight: 700;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.toolbar-right {
  flex: 0 0 auto;
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-end;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #667eea;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  font-size: 1rem;
  line-height: 1;
}

.search-text {
  font-size: 0.875rem;
  white-space: nowrap;
}

/* Responsive design */
@media (max-width: 768px) {
  .viewer-toolbar {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .toolbar-left {
    flex: 1 1 100%;
    order: 1;
  }
  
  .toolbar-center {
    order: 3;
    flex: 1 1 100%;
    display: flex;
    justify-content: center;
  }
  
  .toolbar-right {
    order: 2;
  }
  
  .file-path {
    display: none;
  }
}
</style>

