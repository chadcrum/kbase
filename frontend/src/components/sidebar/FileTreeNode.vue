<template>
  <div class="file-tree-node">
    <div
      class="node-item"
      :class="{
        'is-directory': node.type === 'directory',
        'is-file': node.type === 'file',
        'is-expanded': isExpanded,
        'has-children': hasChildren
      }"
        :style="{ paddingLeft: level * 16 + 8 + 'px' }"
      @click="handleClick"
    >
      <!-- Expand/collapse icon for directories -->
      <span v-if="node.type === 'directory'" class="expand-icon">
        {{ isExpanded ? '📂' : '📁' }}
      </span>
      
      <!-- File icon -->
      <span v-else class="file-icon">📄</span>
      
      <!-- Node name -->
      <span class="node-name">{{ node.name }}</span>
    </div>
    
    <!-- Children (for directories) -->
    <div v-if="node.type === 'directory' && isExpanded && hasChildren" class="children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :expanded-paths="expandedPaths"
        @toggle-expand="$emit('toggleExpand', $event)"
        @select-note="$emit('selectNote', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileTreeNode as FileTreeNodeType } from '@/types'

// Props
interface Props {
  node: FileTreeNodeType
  level: number
  expandedPaths: Set<string>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  toggleExpand: [path: string]
  selectNote: [path: string]
}>()

// Computed properties
const hasChildren = computed(() => {
  return props.node.type === 'directory' && 
         props.node.children && 
         props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedPaths.has(props.node.path)
})

// Methods
const handleClick = () => {
  if (props.node.type === 'directory') {
    emit('toggleExpand', props.node.path)
  } else {
    emit('selectNote', props.node.path)
  }
}
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  min-height: 2rem;
}

.node-item:hover {
  background-color: #f3f4f6;
}

.node-item.is-directory {
  font-weight: 500;
}

.node-item.is-file {
  color: #374151;
}

.expand-icon,
.file-icon {
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.children {
  border-left: 1px solid #e5e7eb;
  margin-left: 0.75rem;
}

/* Hover effects */
.node-item.is-directory:hover {
  background-color: #eff6ff;
}

.node-item.is-file:hover {
  background-color: #f9fafb;
}
</style>
