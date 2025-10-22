<template>
  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <h2 class="file-name">{{ fileName }}</h2>
      <span v-if="filePath" class="file-path">{{ filePath }}</span>
    </div>
    
    <div class="toolbar-center">
      <div class="view-toggle">
        <button
          :class="['toggle-btn', { active: viewMode === 'editor' }]"
          @click="$emit('update:viewMode', 'editor')"
          title="Edit with Monaco editor"
        >
          <span class="icon">✏️</span>
          Editor
        </button>
        <button
          :class="['toggle-btn', { active: viewMode === 'preview' }]"
          @click="$emit('update:viewMode', 'preview')"
          title="View rendered preview"
        >
          <span class="icon">👁️</span>
          Preview
        </button>
      </div>
    </div>
    
    <div class="toolbar-right">
      <div v-if="saveStatus" class="save-status" :class="saveStatus">
        <span v-if="saveStatus === 'saving'" class="status-icon spinner">⏳</span>
        <span v-else-if="saveStatus === 'saved'" class="status-icon">✓</span>
        <span v-else-if="saveStatus === 'error'" class="status-icon">⚠️</span>
        <span class="status-text">{{ saveStatusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  fileName: string
  filePath?: string
  viewMode: 'editor' | 'preview'
  saveStatus?: 'saving' | 'saved' | 'error' | null
}

const props = withDefaults(defineProps<Props>(), {
  filePath: '',
  saveStatus: null
})

// Emits
defineEmits<{
  'update:viewMode': [mode: 'editor' | 'preview']
}>()

// Computed
const saveStatusText = computed(() => {
  switch (props.saveStatus) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
    default:
      return ''
  }
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
  background: white;
  border-radius: 6px;
  padding: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.toggle-btn.active {
  background: #667eea;
  color: white;
  box-shadow: 0 1px 2px rgba(102, 126, 234, 0.3);
}

.toggle-btn .icon {
  font-size: 1rem;
  line-height: 1;
}

.toolbar-right {
  flex: 0 0 auto;
  min-width: 120px;
  display: flex;
  justify-content: flex-end;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.save-status.saving {
  background: #fef3c7;
  color: #92400e;
}

.save-status.saved {
  background: #d1fae5;
  color: #065f46;
}

.save-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.status-icon {
  font-size: 1rem;
  line-height: 1;
}

.status-icon.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-text {
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

