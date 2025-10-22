<template>
  <div class="file-tree-node">
    <div
      class="node-item"
      :class="{
        'is-directory': node.type === 'directory',
        'is-file': node.type === 'file',
        'is-expanded': isExpanded,
        'has-children': hasChildren,
        'is-dragging': isDragging,
        'is-drag-over': isDragOver
      }"
      :style="{ paddingLeft: level * 16 + 8 + 'px' }"
      :draggable="true"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <!-- Expand/collapse icon for directories -->
      <span v-if="node.type === 'directory'" class="expand-icon">
        {{ isExpanded ? '📂' : '📁' }}
      </span>
      
      <!-- File icon -->
      <span v-else class="file-icon">📄</span>
      
      <!-- Node name (editable) -->
      <input
        v-if="isRenaming"
        ref="renameInput"
        v-model="newName"
        class="rename-input"
        @blur="handleRenameBlur"
        @keydown.enter="handleRenameConfirm"
        @keydown.esc="handleRenameCancel"
        @click.stop
      />
      <span v-else class="node-name" @dblclick="startRename">{{ node.name }}</span>
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

    <!-- Context Menu -->
    <ContextMenu
      :is-open="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="showContextMenu = false"
      @select="handleContextMenuAction"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      :is-dangerous="true"
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useVaultStore } from '@/stores/vault'
import ContextMenu, { type ContextMenuItem } from './ContextMenu.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'
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

// Store
const vaultStore = useVaultStore()

// State
const isDragging = ref(false)
const isDragOver = ref(false)
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const showDeleteConfirm = ref(false)
const isRenaming = ref(false)
const newName = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

// Computed properties
const hasChildren = computed(() => {
  return props.node.type === 'directory' && 
         props.node.children && 
         props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedPaths.has(props.node.path)
})

const isDirectory = computed(() => props.node.type === 'directory')

const isAtRoot = computed(() => {
  // Check if the item is at root level (only one level deep)
  const pathParts = props.node.path.split('/').filter(Boolean)
  return pathParts.length === 1
})

const contextMenuItems = computed((): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [
    { label: 'Rename', icon: '✏️', action: 'rename' }
  ]
  
  // Only show "Move to Root" if not already at root
  if (!isAtRoot.value) {
    items.push({ label: 'Move to Root', icon: '↗️', action: 'move-to-root' })
  }
  
  items.push({ label: 'Delete', icon: '🗑️', action: 'delete', isDanger: true })
  
  return items
})

const deleteConfirmTitle = computed(() => {
  return isDirectory.value ? 'Delete Directory' : 'Delete File'
})

const deleteConfirmMessage = computed(() => {
  if (isDirectory.value) {
    return `Are you sure you want to delete "${props.node.name}" and all its contents? This action cannot be undone.`
  } else {
    return `Are you sure you want to delete "${props.node.name}"? This action cannot be undone.`
  }
})

// Methods
const handleClick = () => {
  if (isRenaming.value) return
  
  if (props.node.type === 'directory') {
    emit('toggleExpand', props.node.path)
  } else {
    emit('selectNote', props.node.path)
  }
}

// Context menu handlers
const handleContextMenu = (event: MouseEvent) => {
  event.stopPropagation()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

const handleContextMenuAction = async (action: string) => {
  switch (action) {
    case 'rename':
      startRename()
      break
    case 'move-to-root':
      await handleMoveToRoot()
      break
    case 'delete':
      showDeleteConfirm.value = true
      break
  }
}

// Delete handlers
const handleDeleteConfirm = async () => {
  showDeleteConfirm.value = false
  
  if (isDirectory.value) {
    await vaultStore.deleteDirectory(props.node.path, true)
  } else {
    await vaultStore.deleteFile(props.node.path)
  }
}

// Rename handlers
const startRename = () => {
  if (isRenaming.value) return
  
  newName.value = props.node.name
  isRenaming.value = true
  
  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus()
      // Select filename without extension
      const dotIndex = newName.value.lastIndexOf('.')
      if (dotIndex > 0) {
        renameInput.value.setSelectionRange(0, dotIndex)
      } else {
        renameInput.value.select()
      }
    }
  })
}

const handleRenameConfirm = async () => {
  if (!newName.value || newName.value === props.node.name) {
    isRenaming.value = false
    return
  }
  
  if (isDirectory.value) {
    await vaultStore.renameDirectory(props.node.path, newName.value)
  } else {
    await vaultStore.renameFile(props.node.path, newName.value)
  }
  
  isRenaming.value = false
}

const handleRenameCancel = () => {
  isRenaming.value = false
  newName.value = ''
}

const handleRenameBlur = () => {
  // Delay to allow other events to fire first
  setTimeout(() => {
    if (isRenaming.value) {
      handleRenameConfirm()
    }
  }, 100)
}

// Move to root handler
const handleMoveToRoot = async () => {
  if (isDirectory.value) {
    await vaultStore.moveDirectory(props.node.path, '/')
  } else {
    await vaultStore.moveFile(props.node.path, '/')
  }
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent) => {
  if (isRenaming.value) {
    event.preventDefault()
    return
  }
  
  isDragging.value = true
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify({
      path: props.node.path,
      name: props.node.name,
      type: props.node.type
    }))
  }
}

const handleDragEnd = () => {
  isDragging.value = false
}

const handleDragOver = (event: DragEvent) => {
  // Only allow dropping on directories
  if (!isDirectory.value) return
  
  event.preventDefault()
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false
  
  // Only allow dropping on directories
  if (!isDirectory.value) return
  
  event.preventDefault()
  
  if (!event.dataTransfer) return
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'))
    const draggedPath = data.path
    const draggedType = data.type
    
    // Don't allow dropping on itself
    if (draggedPath === props.node.path) return
    
    // Don't allow dropping a parent into its child
    if (props.node.path.startsWith(draggedPath + '/')) return
    
    // Move the item
    if (draggedType === 'directory') {
      await vaultStore.moveDirectory(draggedPath, props.node.path)
    } else {
      await vaultStore.moveFile(draggedPath, props.node.path)
    }
  } catch (error) {
    console.error('Failed to handle drop:', error)
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
  transition: background-color 0.2s ease, border-color 0.2s ease;
  min-height: 2rem;
  border: 2px solid transparent;
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

/* Drag and drop states */
.node-item.is-dragging {
  opacity: 0.5;
  cursor: move;
}

.node-item.is-drag-over {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

/* Rename input */
.rename-input {
  flex: 1;
  padding: 0.125rem 0.25rem;
  border: 1px solid #667eea;
  border-radius: 3px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
  background: white;
}

.rename-input:focus {
  border-color: #5a67d8;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
</style>
