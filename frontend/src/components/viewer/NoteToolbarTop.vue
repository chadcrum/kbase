<template>
  <div class="note-toolbar-top">
    <!-- Left section -->
    <div class="toolbar-left">
      <!-- Hamburger menu -->
      <button
        v-if="!shouldShowToggleInSidebarToolbar"
        class="sidebar-toggle-btn"
        @click="toggleSidebar"
        :title="sidebarToggleTitle"
      >
        <span class="toggle-icon">{{ sidebarToggleIcon }}</span>
      </button>

      <!-- Tab counter dropdown -->
      <div class="tabs-dropdown-container" ref="tabsDropdownContainerRef">
        <button
          class="tabs-dropdown-btn"
          ref="tabsDropdownBtnRef"
          @click="toggleTabsDropdown"
          :title="'Show all tabs'"
          aria-haspopup="true"
          :aria-expanded="showTabsDropdown"
        >
          <span class="tab-count">{{ tabs.length }}</span>
          <span class="dropdown-icon">▾</span>
        </button>

        <Teleport to="body">
          <div
            v-if="showTabsDropdown"
            class="tabs-dropdown"
            :style="dropdownStyle"
            role="menu"
          >
            <div v-if="tabs.length === 0" class="tabs-dropdown-empty">
              No tabs open
            </div>
            <div
              v-for="tab in tabs"
              :key="tab.id"
              class="tabs-dropdown-item-wrapper"
              :class="{ 'is-active': tab.id === activeTabId }"
            >
              <button
                class="tabs-dropdown-item"
                role="menuitem"
                @click="handleTabSelect(tab.id)"
              >
                <span class="tabs-dropdown-item-icon">📄</span>
                <span class="tabs-dropdown-item-label">{{ tab.title }}</span>
                <span v-if="tab.id === activeTabId" class="tabs-dropdown-item-check">✓</span>
              </button>
              <button
                class="tabs-dropdown-item-close"
                :title="'Close tab'"
                @click.stop="handleCloseTabFromDropdown(tab.id)"
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Note title -->
      <div v-if="noteTitle">
        <!-- Rename input -->
        <input
          v-if="isRenaming"
          ref="renameInput"
          v-model="newName"
          class="note-title-input"
          @blur="handleRenameBlur"
          @keydown.enter="handleRenameConfirm"
          @keydown.esc="handleRenameCancel"
          @click.stop
        />
        <!-- Display title -->
        <div
          v-else
          class="note-title"
          ref="noteTitleRef"
          @contextmenu.prevent="handleContextMenu"
          @pointerdown="handlePointerDown"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerCancel"
          @pointerleave="handlePointerCancel"
          @pointermove="handlePointerMove"
        >
          {{ noteTitle }}
        </div>
      </div>

      <!-- File timestamps (hidden on mobile) -->
      <div v-if="formattedTimestamps" class="file-timestamps">
        {{ formattedTimestamps }}
      </div>
    </div>

    <!-- Right section -->
    <div class="toolbar-right">
      <!-- File path (hidden on mobile) -->
      <div class="file-path-container" v-if="filePath">
        <div class="file-path">
          {{ filePath }}
        </div>
      </div>

      <!-- Close button -->
      <button
        class="close-btn"
        @click="handleCloseTab"
        :title="'Close tab'"
      >
        ×
      </button>
    </div>

    <!-- Context Menu for note title -->
    <ContextMenu
      :is-open="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="showContextMenu = false"
      @select="handleContextMenuAction"
    />

    <!-- File History Modal -->
    <FileHistoryModal
      :is-open="showHistoryModal"
      :note-path="filePath"
      @close="showHistoryModal = false"
      @restored="handleHistoryRestored"
    />

    <!-- Share Dialog -->
    <ShareDialog
      :is-open="showShareDialog"
      :url="shareUrl"
      @close="showShareDialog = false"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      title="Delete File"
      message="Are you sure you want to delete this file? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      :is-dangerous="true"
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteConfirm = false"
    />

    <!-- Directory Picker Dialog for Move -->
    <DirectoryPickerDialog
      :is-open="showMoveDialog"
      :current-path="filePath"
      :initial-directory="getParentPath(filePath)"
      title="Move File"
      message="Select destination directory:"
      @confirm="handleMoveConfirm"
      @cancel="showMoveDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useUIStore } from '@/stores/ui'
import { formatCompactTimestamp } from '@/utils/dateUtils'
import ContextMenu, { type ContextMenuItem } from '@/components/sidebar/ContextMenu.vue'
import FileHistoryModal from '@/components/common/FileHistoryModal.vue'
import ShareDialog from '@/components/common/ShareDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import DirectoryPickerDialog from '@/components/sidebar/DirectoryPickerDialog.vue'

// Props
interface Props {
  filePath?: string
  isPopup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  filePath: '',
  isPopup: false
})

// Emits
const emit = defineEmits<{
  'openSearch': []
}>()

// Store
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const uiStore = useUIStore()

// Refs
const tabsDropdownContainerRef = ref<HTMLElement | null>(null)
const tabsDropdownBtnRef = ref<HTMLElement | null>(null)
const showTabsDropdown = ref(false)
const dropdownStyle = ref<{ left?: string }>({})
const noteTitleRef = ref<HTMLDivElement | null>(null)
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const showHistoryModal = ref(false)
const showShareDialog = ref(false)
const shareUrl = ref('')
const showDeleteConfirm = ref(false)
const showMoveDialog = ref(false)
const longPressTimer = ref<number | null>(null)
const longPressTriggered = ref(false)
const longPressStartCoords = ref<{ x: number; y: number } | null>(null)
const LONG_PRESS_DURATION_MS = 500
const LONG_PRESS_MOVE_THRESHOLD_PX = 10
const isRenaming = ref(false)
const newName = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

// Computed
const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// Note title extraction
const noteTitle = computed(() => {
  if (!props.filePath) return ''
  const parts = props.filePath.split('/')
  const filename = parts[parts.length - 1]
  return filename.endsWith('.md') ? filename.slice(0, -3) : filename || 'Untitled'
})

// Get file timestamps from vault store
const findFileInTree = (node: any, path: string): any => {
  if (!node) return null

  // Check if this node matches the path
  if (node.path === path) return node

  // Search in children if they exist
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findFileInTree(child, path)
      if (found) return found
    }
  }

  return null
}

const fileTimestamps = computed(() => {
  if (!props.filePath) return { created: null, modified: null }

  const fileNode = findFileInTree(vaultStore.fileTree, props.filePath)
  if (!fileNode) return { created: null, modified: null }

  return {
    created: fileNode.created || null,
    modified: fileNode.modified || null
  }
})

const formattedTimestamps = computed(() => {
  const { created, modified } = fileTimestamps.value
  if (!created && !modified) return ''

  let result = ''
  if (created) result += `c: ${formatCompactTimestamp(created)}`
  if (modified) {
    if (result) result += ' | '
    result += `m: ${formatCompactTimestamp(modified)}`
  }

  return result
})

// Context menu items for note title
const contextMenuItems = computed((): ContextMenuItem[] => {
  if (!props.filePath) return []

  return [
    { label: 'Open in New Window', icon: '🪟', action: 'open-in-popup' },
    { label: 'History', icon: '📜', action: 'history' },
    { label: 'Copy Link', icon: '🔗', action: 'share' },
    { label: 'Rename', icon: '✏️', action: 'rename' },
    { label: 'Move…', icon: '🚚', action: 'move' },
    { label: 'Delete', icon: '🗑️', action: 'delete', isDanger: true }
  ]
})

// Sidebar toggle
const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

const sidebarToggleIcon = computed(() => {
  return '☰'
})

const sidebarToggleTitle = computed(() => {
  if (uiStore.isMobileView) {
    return uiStore.activeMobilePane === 'sidebar' ? 'Show Editor' : 'Show File Explorer'
  } else {
    return uiStore.sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'
  }
})

// Show toggle button in sidebar toolbar on mobile when sidebar is active
const shouldShowToggleInSidebarToolbar = computed(() => {
  return uiStore.isMobileView && uiStore.activeMobilePane === 'sidebar'
})

// Tabs dropdown
const updateDropdownPosition = () => {
  if (!tabsDropdownBtnRef.value || !showTabsDropdown.value) return

  nextTick(() => {
    if (!tabsDropdownBtnRef.value) return

    const rect = tabsDropdownBtnRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const dropdownWidth = 320

    // Start with left edge of the button
    let leftOffset = rect.left

    // Check if dropdown would overflow right edge
    if (leftOffset + dropdownWidth > viewportWidth) {
      // Position to the right of button, aligned to right edge
      leftOffset = rect.right - dropdownWidth
    }

    // Clamp to viewport bounds - don't go off-screen left or right
    leftOffset = Math.max(0, Math.min(leftOffset, viewportWidth - dropdownWidth))

    dropdownStyle.value = {
      left: `${leftOffset}px`
    }
  })
}

const toggleTabsDropdown = () => {
  showTabsDropdown.value = !showTabsDropdown.value
  if (showTabsDropdown.value) {
    updateDropdownPosition()
  }
}

const handleTabSelect = (tabId: string) => {
  const tab = tabsStore.tabs.find(t => t.id === tabId)
  if (tab) {
    tabsStore.setActiveTab(tabId)
    vaultStore.loadNote(tab.path)
    showTabsDropdown.value = false
  }
}

const handleCloseTabFromDropdown = (tabId: string) => {
  const tab = tabsStore.tabs.find(t => t.id === tabId)
  if (!tab) return

  tabsStore.closeTab(tabId)

  if (tabsStore.activeTabPath) {
    vaultStore.loadNote(tabsStore.activeTabPath)
  } else {
    vaultStore.clearSelection()
  }

  if (tabsStore.tabs.length === 0) {
    showTabsDropdown.value = false
  }
}

// Close current tab
const handleCloseTab = () => {
  if (!activeTabId.value) return

  tabsStore.closeTab(activeTabId.value)

  if (tabsStore.activeTabPath) {
    vaultStore.loadNote(tabsStore.activeTabPath)
  } else {
    vaultStore.clearSelection()
  }
}

// Handle click outside dropdown
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.tabs-dropdown-container')) {
    showTabsDropdown.value = false
  }
}

// Handle window resize
const handleResize = () => {
  if (showTabsDropdown.value) {
    updateDropdownPosition()
  }
}

// Context menu and long-press handlers
const isTouchLikePointer = (event: PointerEvent) => {
  return event.pointerType === 'touch' || event.pointerType === 'pen'
}

const cancelLongPressTimer = () => {
  if (longPressTimer.value !== null) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  longPressStartCoords.value = null
}

const openContextMenuAt = (x: number, y: number) => {
  contextMenuX.value = x
  contextMenuY.value = y
  showContextMenu.value = true
}

const handleContextMenu = (event: MouseEvent) => {
  event.stopPropagation()
  cancelLongPressTimer()
  openContextMenuAt(event.clientX, event.clientY)
}

const handlePointerDown = (event: PointerEvent) => {
  if (!isTouchLikePointer(event)) {
    return
  }

  cancelLongPressTimer()
  longPressTriggered.value = false
  const startCoords = { x: event.clientX, y: event.clientY }
  longPressStartCoords.value = startCoords

  longPressTimer.value = window.setTimeout(() => {
    longPressTriggered.value = true
    const coords = longPressStartCoords.value ?? startCoords
    openContextMenuAt(coords.x, coords.y)
    cancelLongPressTimer()
  }, LONG_PRESS_DURATION_MS)
}

const handlePointerUp = () => {
  cancelLongPressTimer()
}

const handlePointerCancel = () => {
  cancelLongPressTimer()
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isTouchLikePointer(event)) {
    return
  }

  if (!longPressStartCoords.value || longPressTimer.value === null) {
    return
  }

  const deltaX = event.clientX - longPressStartCoords.value.x
  const deltaY = event.clientY - longPressStartCoords.value.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance > LONG_PRESS_MOVE_THRESHOLD_PX) {
    cancelLongPressTimer()
  }
}

// Open note in popup window
const openNoteInPopup = () => {
  if (!props.filePath) return

  const encodedPath = encodeURIComponent(props.filePath)
  const popupUrl = `/?popup=true&note=${encodedPath}`

  const windowName = `kbase-popup-${props.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`

  const windowFeatures = [
    'width=1000',
    'height=700',
    'left=' + Math.round((screen.width - 1000) / 2),
    'top=' + Math.round((screen.height - 700) / 2),
    'resizable=yes',
    'scrollbars=yes',
    'menubar=no',
    'toolbar=no',
    'status=no'
  ].join(',')

  const popupWindow = window.open(popupUrl, windowName, windowFeatures)

  if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
    alert('Popup blocked. Please allow popups for this site to open notes in a new window.')
    return
  }

  popupWindow.focus()
}

// Get parent path
const getParentPath = (path: string): string => {
  if (path === '/' || !path) return '/'
  const segments = path.split('/').filter(Boolean)
  if (segments.length <= 1) return '/'
  segments.pop()
  return `/${segments.join('/')}`
}

// Handle context menu action
const handleContextMenuAction = (action: string) => {
  switch (action) {
    case 'open-in-popup':
      openNoteInPopup()
      break
    case 'history':
      showHistoryModal.value = true
      break
    case 'share':
      shareUrl.value = `${window.location.origin}/?note=${encodeURIComponent(props.filePath)}`
      showShareDialog.value = true
      break
    case 'rename':
      startRename()
      break
    case 'move':
      showMoveDialog.value = true
      break
    case 'delete':
      showDeleteConfirm.value = true
      break
  }
}

const handleDeleteConfirm = async () => {
  showDeleteConfirm.value = false
  if (props.filePath) {
    await vaultStore.deleteFile(props.filePath)
  }
}

const handleMoveConfirm = async (targetPath: string) => {
  showMoveDialog.value = false
  if (props.filePath && targetPath) {
    // Get the filename
    const parts = props.filePath.split('/')
    const filename = parts[parts.length - 1]
    const newPath = targetPath === '/' ? `/${filename}` : `${targetPath}/${filename}`
    await vaultStore.moveFile(props.filePath, newPath)
  }
}

const handleHistoryRestored = async (restoredPath?: string) => {
  const path = restoredPath || props.filePath
  if (path) {
    await new Promise(resolve => setTimeout(resolve, 300))
    await vaultStore.refresh()

    if (vaultStore.selectedNotePath === path) {
      await vaultStore.loadNote(path, true)
    }
  }
}

// Rename handlers
const startRename = () => {
  if (isRenaming.value || !props.filePath) return

  // Extract filename without .md extension
  const parts = props.filePath.split('/')
  const filename = parts[parts.length - 1]
  newName.value = filename.endsWith('.md') ? filename.slice(0, -3) : filename

  isRenaming.value = true

  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus()
      // Select filename without extension if it has .md
      if (filename.endsWith('.md')) {
        renameInput.value.select()
      } else {
        const dotIndex = newName.value.lastIndexOf('.')
        if (dotIndex > 0) {
          renameInput.value.setSelectionRange(0, dotIndex)
        } else {
          renameInput.value.select()
        }
      }
    }
  })
}

const handleRenameConfirm = async () => {
  if (!newName.value || !props.filePath) {
    isRenaming.value = false
    return
  }

  // Extract original filename
  const parts = props.filePath.split('/')
  const originalFilename = parts[parts.length - 1]
  const originalNameWithoutExt = originalFilename.endsWith('.md')
    ? originalFilename.slice(0, -3)
    : originalFilename

  if (newName.value === originalNameWithoutExt) {
    isRenaming.value = false
    return
  }

  // Add .md extension if the original had it
  const newFilename = originalFilename.endsWith('.md')
    ? `${newName.value}.md`
    : newName.value

  // Build the new path
  const pathSegments = props.filePath.split('/').slice(0, -1)
  const newPath = pathSegments.length > 0
    ? `${pathSegments.join('/')}/${newFilename}`
    : `/${newFilename}`

  await vaultStore.renameFile(props.filePath, newFilename)

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

// Lifecycle
onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  cancelLongPressTimer()
})
</script>

<style scoped>
.note-toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
  overflow: hidden;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}

.note-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 2;
  max-width: 400px;
  cursor: context-menu;
  user-select: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.note-title:hover {
  background-color: var(--bg-tertiary);
}

.note-title-input {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 2px solid #667eea;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  min-width: 0;
  flex-shrink: 2;
  max-width: 400px;
  font-family: inherit;
  outline: none;
}

.note-title-input:focus {
  background: var(--bg-tertiary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.file-path-container {
  flex-shrink: 1;
  min-width: 0;
  max-width: none;
  overflow: hidden;
  flex: 0 1 auto;
}

.file-path {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-timestamps {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow);
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.close-btn:active {
  transform: scale(0.95);
}

/* Sidebar toggle button */
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
}

/* Tabs dropdown */
.tabs-dropdown-container {
  position: relative;
  display: flex;
  align-items: center;
}

.tabs-dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 2rem;
  height: 2rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow);
  gap: 0.125rem;
}

.tabs-dropdown-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabs-dropdown-btn:active {
  transform: scale(0.98);
}

.tab-count {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  line-height: 1;
  flex-shrink: 0;
}

.dropdown-icon {
  font-size: 0.75rem;
  line-height: 1;
  flex-shrink: 0;
  margin-left: 0.125rem;
}

.tabs-dropdown {
  position: fixed;
  top: calc(var(--tabs-bar-height) + 0.5rem);
  display: flex;
  flex-direction: column;
  min-width: 240px;
  max-width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 10px 20px -10px var(--shadow);
  padding: 0.5rem 0;
  z-index: 10000;
}

.tabs-dropdown-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.tabs-dropdown-item-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  transition: background-color 0.2s ease;
}

.tabs-dropdown-item-wrapper:hover {
  background-color: var(--bg-tertiary);
}

.tabs-dropdown-item-wrapper.is-active {
  background-color: var(--bg-tertiary);
}

.tabs-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  flex: 1;
  text-align: left;
  font-size: 0.9rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-width: 0;
}

.tabs-dropdown-item-wrapper.is-active .tabs-dropdown-item {
  font-weight: 500;
}

.tabs-dropdown-item-icon {
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.tabs-dropdown-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tabs-dropdown-item-check {
  color: #667eea;
  font-weight: bold;
  flex-shrink: 0;
}

.tabs-dropdown-item-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin-right: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
  opacity: 0.6;
}

.tabs-dropdown-item-wrapper:hover .tabs-dropdown-item-close {
  opacity: 1;
}

.tabs-dropdown-item-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tabs-dropdown-item-close:active {
  background: var(--border-color);
}

.tabs-dropdown::-webkit-scrollbar {
  width: 6px;
}

.tabs-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-dropdown::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.tabs-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Icon normalization for consistent alignment */
.toggle-icon,
.dropdown-icon,
.tab-count,
.tabs-dropdown-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-variant-emoji: text;
  vertical-align: middle;
}

/* Responsive design */
@media (max-width: 768px) {
  .note-toolbar-top {
    padding: 0.5rem;
  }

  .file-path {
    display: none;
  }

  .file-timestamps {
    display: none;
  }

  .sidebar-toggle-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.25rem;
  }

  .tabs-dropdown-btn,
  .close-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.25rem;
  }

  .tabs-dropdown-icon,
  .tab-count {
    font-size: 1.25rem;
  }
}
</style>