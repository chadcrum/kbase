<template>
  <div class="file-tree-node">
    <div
      ref="nodeItem"
      class="node-item"
      :class="{
        'is-directory': node.type === 'directory',
        'is-file': node.type === 'file',
        'is-expanded': isExpanded,
        'has-children': hasChildren,
        'is-dragging': isDragging,
        'is-drag-over': isDragOver,
        'is-selected': isSelected
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
      
      <!-- Item count for directories -->
      <span v-if="node.type === 'directory' && itemCount > 0" class="item-count">{{ itemCount }}</span>
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

    <!-- Input Dialog for Create Folder -->
    <InputDialog
      :is-open="showCreateFolderDialog"
      title="Create New Folder"
      message="Enter the folder name:"
      placeholder="folder-name"
      confirm-text="Create"
      :validator="validateFolderName"
      @confirm="createFolderInDirectory"
      @cancel="showCreateFolderDialog = false"
    />

    <!-- Input Dialog for Create Note -->
    <InputDialog
      :is-open="showCreateFileDialog"
      title="Create New Note"
      message="Enter the note name (with .md extension):"
      placeholder="note-name.md"
      confirm-text="Create"
      :validator="validateFileName"
      @confirm="createNoteInDirectory"
      @cancel="showCreateFileDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted } from 'vue'
import { useVaultStore } from '@/stores/vault'
import ContextMenu, { type ContextMenuItem } from './ContextMenu.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import InputDialog from '../common/InputDialog.vue'
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
const dragHoverTimer = ref<number | null>(null)
const showCreateFolderDialog = ref(false)
const showCreateFileDialog = ref(false)
const nodeItem = ref<HTMLDivElement | null>(null)

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

const selectedNotePath = computed(() => vaultStore.selectedNotePath)

const isSelected = computed(() => {
  if (props.node.type !== 'file') {
    return false
  }
  return props.node.path === selectedNotePath.value
})

const scrollSelectedIntoView = () => {
  if (!isSelected.value) return

  nextTick(() => {
    const element = nodeItem.value
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  })
}

watch(isSelected, (selected) => {
  if (selected) {
    scrollSelectedIntoView()
  }
})

onMounted(() => {
  if (isSelected.value) {
    scrollSelectedIntoView()
  }
})

const contextMenuItems = computed((): ContextMenuItem[] => {
  const items: ContextMenuItem[] = []
  
  // Add "Create Directory" and "Create Note" options for directories
  if (isDirectory.value) {
    items.push(
      { label: 'Create Directory', icon: '📁', action: 'create-folder' },
      { label: 'Create Note', icon: '📄', action: 'create-note' }
    )
  }
  
  items.push({ label: 'Rename', icon: '✏️', action: 'rename' })
  
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

const itemCount = computed(() => {
  if (props.node.type !== 'directory' || !props.node.children) return 0
  
  function countItems(children: FileTreeNodeType[]): number {
    let count = children.length
    children.forEach(child => {
      if (child.type === 'directory' && child.children) {
        count += countItems(child.children)
      }
    })
    return count
  }
  
  return countItems(props.node.children)
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
    case 'create-folder':
      showCreateFolderDialog.value = true
      break
    case 'create-note':
      showCreateFileDialog.value = true
      break
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

// Validation functions
/**
 * Validates folder name to prevent path traversal and invalid characters
 * @param name - The folder name to validate
 * @returns Error message if invalid, null if valid
 */
const validateFolderName = (name: string): string | null => {
  // Check for empty name
  if (!name.trim()) {
    return 'Folder name cannot be empty'
  }

  // Check for path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return 'Folder name cannot contain path separators or ..'
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(name)) {
    return 'Folder name contains invalid characters'
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(name.toUpperCase())) {
    return 'This is a reserved folder name'
  }

  return null
}

/**
 * Validates file name to prevent path traversal and ensure .md extension
 * @param name - The file name to validate
 * @returns Error message if invalid, null if valid
 */
const validateFileName = (name: string): string | null => {
  // Check for empty name
  if (!name.trim()) {
    return 'File name cannot be empty'
  }

  // Check for path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return 'File name cannot contain path separators or ..'
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(name)) {
    return 'File name contains invalid characters'
  }

  // Ensure .md extension
  if (!name.endsWith('.md')) {
    return 'File name must end with .md extension'
  }

  // Check for reserved names (Windows)
  const baseName = name.replace(/\.md$/, '')
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(baseName.toUpperCase())) {
    return 'This is a reserved file name'
  }

  return null
}

// Creation handlers
/**
 * Creates a new folder within the current directory
 * @param folderName - The name of the folder to create
 */
const createFolderInDirectory = async (folderName: string) => {
  // Build the full path for the new folder
  const newFolderPath = props.node.path === '/' 
    ? `/${folderName}` 
    : `${props.node.path}/${folderName}`
  
  const success = await vaultStore.createDirectory(newFolderPath)
  if (success) {
    showCreateFolderDialog.value = false
    
    // Auto-expand the directory to show the newly created folder
    if (!isExpanded.value) {
      emit('toggleExpand', props.node.path)
    }
  }
}

/**
 * Creates a new note within the current directory
 * @param fileName - The name of the file to create (must end with .md)
 */
const createNoteInDirectory = async (fileName: string) => {
  // Ensure .md extension (already validated, but being defensive)
  const fullFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`
  
  // Build the full path for the new note
  const newNotePath = props.node.path === '/' 
    ? `/${fullFileName}` 
    : `${props.node.path}/${fullFileName}`
  
  const success = await vaultStore.createNote(newNotePath)
  if (success) {
    showCreateFileDialog.value = false
    
    // Auto-expand the directory to show the newly created note
    if (!isExpanded.value) {
      emit('toggleExpand', props.node.path)
    }
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
  
  // Clear hover timer to prevent memory leaks
  if (dragHoverTimer.value) {
    clearTimeout(dragHoverTimer.value)
    dragHoverTimer.value = null
  }
}

const handleDragOver = (event: DragEvent) => {
  // Only allow dropping on directories
  if (!isDirectory.value) return
  
  event.preventDefault()
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  
  isDragOver.value = true
  
  // Auto-expand collapsed directories after hovering for 600ms
  if (!isExpanded.value && !dragHoverTimer.value) {
    dragHoverTimer.value = window.setTimeout(() => {
      emit('toggleExpand', props.node.path)
      dragHoverTimer.value = null
    }, 600)
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
  
  // Clear hover timer to prevent unwanted expansion
  if (dragHoverTimer.value) {
    clearTimeout(dragHoverTimer.value)
    dragHoverTimer.value = null
  }
}

const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false
  
  // Clear hover timer
  if (dragHoverTimer.value) {
    clearTimeout(dragHoverTimer.value)
    dragHoverTimer.value = null
  }
  
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
    
    // Expand the directory after successful drop if it's collapsed
    if (!isExpanded.value) {
      emit('toggleExpand', props.node.path)
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
  background-color: var(--bg-tertiary);
}

.node-item.is-directory {
  font-weight: 500;
}

.node-item.is-file {
  color: var(--text-primary);
}

.node-item.is-selected {
  background-color: var(--bg-tertiary);
  border-color: #667eea;
}

.node-item.is-selected:hover {
  background-color: var(--bg-tertiary);
}

.expand-icon,
.file-icon {
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.node-name {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  font-weight: normal;
  margin-left: 0.25rem;
  flex-shrink: 0;
}

.children {
  border-left: 1px solid var(--border-color-subtle);
  margin-left: 0.75rem;
}

/* Hover effects */
.node-item.is-directory:hover {
  background-color: var(--bg-tertiary);
}

.node-item.is-file:hover {
  background-color: var(--bg-tertiary);
}

/* Drag and drop states */
.node-item.is-dragging {
  opacity: 0.5;
  cursor: move;
}

.node-item.is-drag-over {
  background-color: var(--bg-tertiary);
  border-color: #667eea;
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
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.rename-input:focus {
  border-color: #5a67d8;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
</style>
