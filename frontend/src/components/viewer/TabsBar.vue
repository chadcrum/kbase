<template>
  <div class="tabs-bar" :style="{ '--toolbar-left': toolbarLeft }">
    <!-- Sidebar toggle at far left -->
    <button class="sidebar-toggle-btn" @click="toggleSidebar" :title="sidebarToggleTitle">
      <span class="toggle-icon">{{ sidebarToggleIcon }}</span>
    </button>

    <div 
      class="tabs-container" 
      ref="tabsContainerRef"
      @dragover="handleContainerDragOver"
      @dragleave="handleContainerDragLeave"
    >
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :data-tab-id="tab.id"
        :class="{
          'is-active': tab.id === activeTabId,
          'is-dragging': draggingTabId === tab.id,
          'is-drag-over': dragOverTabId === tab.id
        }"
        draggable="true"
        @click="handleTabClick(tab.id)"
        @mousedown="handleTabMouseDown($event, tab.id)"
        @dragstart="handleDragStart($event, tab.id)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, tab.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, tab.id)"
        @touchstart="handleTouchStart($event, tab.id)"
        @touchmove="handleTouchMove($event)"
        @touchend="handleTouchEnd"
        @contextmenu.prevent="handleTabContextMenu($event, tab.id)"
      >
        <span class="tab-title">
          {{ tab.title }}
        </span>
        <button
          class="tab-close"
          @click.stop="handleCloseTab(tab.id)"
          @contextmenu.stop
          :title="'Close tab'"
        >
          ×
        </button>
      </div>
      
      <!-- Drop indicator - positioned dynamically -->
      <div
        v-if="dropIndicatorLeft !== null && draggingTabId"
        class="tab-drop-indicator"
        :style="{ left: `${dropIndicatorLeft}px` }"
      ></div>
    </div>

    <!-- Action buttons at far right -->
    <div class="tabs-actions">
      <!-- Tabs dropdown -->
      <div class="tabs-dropdown-container" ref="tabsDropdownContainerRef">
        <button
          class="tabs-dropdown-btn"
          ref="tabsDropdownBtnRef"
          @click="toggleTabsDropdown"
          :title="'Show all tabs'"
          aria-haspopup="true"
          :aria-expanded="showTabsDropdown"
        >
          <span class="tabs-dropdown-icon">📋</span>
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

    <!-- Context Menu -->
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
      :note-path="historyModalPath"
      @close="showHistoryModal = false; historyModalPath = null"
      @restored="(path) => handleHistoryRestored(path)"
    />

    <!-- Share Dialog -->
    <ShareDialog
      :is-open="showShareDialog"
      :url="shareUrl"
      @close="showShareDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted, onUnmounted, nextTick } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useEditorStore } from '@/stores/editor'
import ContextMenu, { type ContextMenuItem } from '@/components/sidebar/ContextMenu.vue'
import FileHistoryModal from '@/components/common/FileHistoryModal.vue'
import ShareDialog from '@/components/common/ShareDialog.vue'

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
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const editorStore = useEditorStore()

// Refs
const tabsContainerRef = ref<HTMLElement | null>(null)
const tabsDropdownContainerRef = ref<HTMLElement | null>(null)
const tabsDropdownBtnRef = ref<HTMLElement | null>(null)
const showTabsDropdown = ref(false)
const dropdownStyle = ref<{ right?: string }>({})

// State for long-press detection (mobile context menu)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let currentLongPressTabId: string | null = null
let longPressTouchCoords: { x: number; y: number } | null = null
const LONG_PRESS_DURATION = 500 // ms

// State for drag and drop (desktop only)
let draggingTabId: string | null = null
let dragOverTabId: string | null = null
let dragStartIndex = -1
let dragOverIndex = -1
let dropPosition: 'before' | 'after' | null = null // Position indicator for drop
let dropIndicatorLeft = ref<number | null>(null) // Pixel position for drop indicator

// State for context menu
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTabId = ref<string | null>(null)
const showHistoryModal = ref(false)
const historyModalPath = ref<string | null>(null)
const showShareDialog = ref(false)
const shareUrl = ref('')

// State for preventing paste after middle-click
let preventPasteUntil: number | null = null
const PREVENT_PASTE_DURATION = 500 // ms

// Computed
const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

const toolbarLeft = computed(() => {
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})

// Sidebar toggle
const toggleSidebar = () => {
  vaultStore.toggleSidebar()
}

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

const editorToggleTitle = computed(() => {
  return editorStore.markdownEditor === 'milkdown'
    ? 'Switch to CodeMirror Editor'
    : 'Switch to Milkdown Editor'
})

// Search
const openSearch = () => {
  emit('openSearch')
}

// Tabs dropdown
const updateDropdownPosition = () => {
  if (!tabsDropdownBtnRef.value || !showTabsDropdown.value) return
  
  nextTick(() => {
    if (!tabsDropdownBtnRef.value) return
    
    const rect = tabsDropdownBtnRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const dropdownWidth = 320 // max-width from CSS
    const rightOffset = viewportWidth - rect.right
    
    // Position dropdown aligned to button's right edge
    dropdownStyle.value = {
      right: `${rightOffset}px`
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

  // If tab was active and we closed it, load the new active tab
  if (tabsStore.activeTabPath) {
    vaultStore.loadNote(tabsStore.activeTabPath)
  } else {
    // No active tab, clear selection
    vaultStore.clearSelection()
  }

  // Close dropdown if no tabs remain
  if (tabsStore.tabs.length === 0) {
    showTabsDropdown.value = false
  }
}

/**
 * Close dropdown when clicking outside
 */
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.tabs-dropdown-container')) {
    showTabsDropdown.value = false
  }
}

// Methods
const handleTabClick = (id: string) => {
  const tab = tabsStore.tabs.find(t => t.id === id)
  if (tab) {
    tabsStore.setActiveTab(id)
    vaultStore.loadNote(tab.path)
  }
}

const handleTabMouseDown = (event: MouseEvent, id: string) => {
  // Middle mouse button (button 1) closes the tab
  if (event.button === 1) {
    event.preventDefault()
    event.stopPropagation()
    // Prevent drag from starting
    const tabElement = event.currentTarget as HTMLElement
    if (tabElement) {
      tabElement.draggable = false
      // Re-enable draggable after a short delay to allow the close to complete
      setTimeout(() => {
        tabElement.draggable = true
      }, 0)
    }
    // Set flag to prevent paste events for a short duration
    // This prevents browser's default middle-click paste behavior
    preventPasteUntil = Date.now() + PREVENT_PASTE_DURATION
    handleCloseTab(id)
  }
}

const handleCloseTab = (id: string) => {
  const tab = tabsStore.tabs.find(t => t.id === id)
  if (!tab) return

  tabsStore.closeTab(id)

  // If tab was active and we closed it, load the new active tab
  if (tabsStore.activeTabPath) {
    vaultStore.loadNote(tabsStore.activeTabPath)
  } else {
    // No active tab, clear selection
    vaultStore.clearSelection()
  }
}

// Drag and drop handlers (desktop)
const handleDragStart = (event: DragEvent, tabId: string) => {
  // Prevent drag on close button
  if ((event.target as HTMLElement).closest('.tab-close')) {
    event.preventDefault()
    return
  }

  draggingTabId = tabId
  dragStartIndex = tabsStore.tabs.findIndex(tab => tab.id === tabId)

  // Set drag data
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', tabId)

  // Create custom drag image (invisible to avoid visual artifacts)
  const dragImage = new Image()
  dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  event.dataTransfer!.setDragImage(dragImage, 0, 0)
}

const handleDragEnd = () => {
  draggingTabId = null
  dragOverTabId = null
  dragStartIndex = -1
  dragOverIndex = -1
  dropPosition = null
  dropIndicatorLeft.value = null
}

const handleDragOver = (event: DragEvent, tabId: string) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'

  if (draggingTabId && draggingTabId !== tabId) {
    dragOverTabId = tabId
    const currentIndex = tabsStore.tabs.findIndex(tab => tab.id === tabId)
    
    // Calculate drop position based on mouse position within the tab
    const tabElement = event.currentTarget as HTMLElement
    if (tabElement && tabsContainerRef.value) {
      const tabRect = tabElement.getBoundingClientRect()
      const containerRect = tabsContainerRef.value.getBoundingClientRect()
      const mouseX = event.clientX
      const tabCenterX = tabRect.left + tabRect.width / 2
      
      // Determine if drop should be before or after this tab
      // If mouse is in left half, drop before; if in right half, drop after
      dropPosition = mouseX < tabCenterX ? 'before' : 'after'
      
      // Calculate the pixel position for the drop indicator
      // Position relative to the tabs container
      if (dropPosition === 'before') {
        dropIndicatorLeft.value = tabRect.left - containerRect.left - 1
      } else {
        dropIndicatorLeft.value = tabRect.right - containerRect.left - 1
      }
      
      // Adjust dragOverIndex based on drop position
      // When dragging, we need to account for the fact that removing the dragged tab
      // will shift indices. The reorderTabs function handles this, but we need to
      // calculate the correct target index.
      const draggedIndex = tabsStore.tabs.findIndex(tab => tab.id === draggingTabId)
      if (dropPosition === 'after') {
        // Dropping after this tab
        if (draggedIndex < currentIndex) {
          // Dragging forward: after removing dragged tab, target position shifts left by 1
          dragOverIndex = currentIndex
        } else {
          // Dragging backward: target position is after current tab
          dragOverIndex = currentIndex + 1
        }
      } else {
        // Dropping before this tab
        if (draggedIndex < currentIndex) {
          // Dragging forward: after removing dragged tab, target position shifts left by 1
          dragOverIndex = currentIndex - 1
        } else {
          // Dragging backward: target position is before current tab (no shift needed)
          dragOverIndex = currentIndex
        }
      }
      
      // Ensure index is within bounds
      dragOverIndex = Math.max(0, Math.min(dragOverIndex, tabsStore.tabs.length - 1))
    }
  } else {
    dragOverTabId = null
    dragOverIndex = -1
    dropPosition = null
    dropIndicatorLeft.value = null
  }
}

const handleDragLeave = (event: DragEvent) => {
  // Only clear if we're actually leaving the tab (not entering a child element)
  if (event.currentTarget && event.relatedTarget && event.currentTarget instanceof HTMLElement && event.relatedTarget instanceof Node) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverTabId = null
      dragOverIndex = -1
      dropPosition = null
      // Don't clear dropIndicatorLeft here - let container handler manage it
    }
  }
}

const handleContainerDragOver = (event: DragEvent) => {
  // Handle dragging over the container but not a specific tab (for end position)
  if (draggingTabId && tabsContainerRef.value && !dragOverTabId && tabs.value.length > 0) {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    
    // Check if we're near the end of the tabs
    const containerRect = tabsContainerRef.value.getBoundingClientRect()
    const lastTab = tabs.value[tabs.value.length - 1]
    const lastTabElement = tabsContainerRef.value.querySelector(`[data-tab-id="${lastTab.id}"]`) as HTMLElement
    
    if (lastTabElement) {
      const lastTabRect = lastTabElement.getBoundingClientRect()
      const mouseX = event.clientX
      
      // If mouse is past the middle of the last tab, show indicator at the end
      if (mouseX > lastTabRect.left + lastTabRect.width / 2) {
        dropIndicatorLeft.value = lastTabRect.right - containerRect.left - 1
        // For dropping at the end, calculate the correct index
        const draggedIndex = tabsStore.tabs.findIndex(tab => tab.id === draggingTabId)
        const lastIndex = tabs.value.length - 1
        if (draggedIndex < lastIndex) {
          // Dragging forward: after removal, last index becomes lastIndex - 1, so insert at lastIndex
          dragOverIndex = lastIndex
        } else {
          // Dragging backward or already at end: insert at last valid position
          dragOverIndex = lastIndex
        }
        dropPosition = 'after'
      }
    }
  }
}

const handleContainerDragLeave = (event: DragEvent) => {
  // Clear indicator if leaving the container entirely
  if (event.relatedTarget && tabsContainerRef.value) {
    const relatedTarget = event.relatedTarget as Node
    if (!tabsContainerRef.value.contains(relatedTarget)) {
      dropIndicatorLeft.value = null
      dragOverTabId = null
      dragOverIndex = -1
      dropPosition = null
    }
  }
}

const handleDrop = (event: DragEvent, tabId: string) => {
  event.preventDefault()

  if (draggingTabId && dragStartIndex !== -1 && dragOverIndex !== -1) {
    // Only reorder if the indices are valid and different
    const tabsLength = tabs.value.length
    if (dragStartIndex !== dragOverIndex && dragOverIndex >= 0 && dragOverIndex < tabsLength) {
      tabsStore.reorderTabs(dragStartIndex, dragOverIndex)
    }
  }

  handleDragEnd()
}

// Touch handlers for mobile (long press shows context menu)
const handleTouchStart = (event: TouchEvent, tabId: string) => {
  // Only start long press if not on close button
  if ((event.target as HTMLElement).closest('.tab-close')) {
    return
  }

  // Clear any existing timer
  if (longPressTimer) {
    clearTimeout(longPressTimer)
  }

  // Store touch coordinates for context menu positioning
  const touch = event.touches[0]
  longPressTouchCoords = { x: touch.clientX, y: touch.clientY }

  // Set up long press for context menu
  currentLongPressTabId = tabId
  longPressTimer = setTimeout(() => {
    if (currentLongPressTabId === tabId && longPressTouchCoords) {
      // Show context menu at touch coordinates
      contextMenuTabId.value = tabId
      contextMenuX.value = longPressTouchCoords.x
      contextMenuY.value = longPressTouchCoords.y
      showContextMenu.value = true
      
      // Clean up
      currentLongPressTabId = null
      longPressTouchCoords = null
    }
  }, LONG_PRESS_DURATION)
}

const handleTouchEnd = () => {
  // Clear long press timer
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  currentLongPressTabId = null
  longPressTouchCoords = null
}

const handleTouchMove = (event: TouchEvent) => {
  // Cancel long press if user starts moving (prevents accidental menu during scroll)
  if (longPressTimer) {
    const touch = event.touches[0]
    if (longPressTouchCoords) {
      const deltaX = Math.abs(touch.clientX - longPressTouchCoords.x)
      const deltaY = Math.abs(touch.clientY - longPressTouchCoords.y)
      const distance = Math.hypot(deltaX, deltaY)
      
      // Only cancel if moved more than threshold
      if (distance > 10) {
        clearTimeout(longPressTimer)
        longPressTimer = null
        currentLongPressTabId = null
        longPressTouchCoords = null
      }
    } else {
      clearTimeout(longPressTimer)
      longPressTimer = null
      currentLongPressTabId = null
    }
  }
}

// Context menu handlers
const handleTabContextMenu = (event: MouseEvent, tabId: string) => {
  event.stopPropagation()
  contextMenuTabId.value = tabId
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

const contextMenuItems = computed((): ContextMenuItem[] => {
  if (!contextMenuTabId.value) return []
  
  const tab = tabsStore.tabs.find(t => t.id === contextMenuTabId.value)
  if (!tab) return []
  
  const items: ContextMenuItem[] = []
  
  // Open in New Window option (for file tabs)
  if (tab.path) {
    items.push({
      label: 'Open in New Window',
      icon: '🪟',
      action: 'open-in-popup'
    })
    
    // Locate the file option (for file tabs)
    items.push({
      label: 'Locate the file',
      icon: '📍',
      action: 'locate-file'
    })
    
    // History option (for file tabs)
    items.push({
      label: 'History',
      icon: '📜',
      action: 'history'
    })

    // Copy Link option (for file tabs)
    items.push({
      label: 'Copy Link',
      icon: '🔗',
      action: 'share'
    })
  }
  
  // Close option
  items.push({
    label: 'Close',
    icon: '✖️',
    action: 'close'
  })
  
  // Close Others option (only if there are other tabs)
  if (tabsStore.tabs.length > 1) {
    items.push({
      label: 'Close Others',
      icon: '🗙',
      action: 'close-others'
    })
  }
  
  // Close All option
  if (tabsStore.tabs.length > 1) {
    items.push({
      label: 'Close All',
      icon: '🗑️',
      action: 'close-all',
      isDanger: true
    })
  }
  
  return items
})

const handleContextMenuAction = (action: string) => {
  if (!contextMenuTabId.value) return
  
  const tab = tabsStore.tabs.find(t => t.id === contextMenuTabId.value)
  if (!tab) return
  
  switch (action) {
    case 'open-in-popup':
      openTabInPopup(tab.path)
      break
    case 'locate-file':
      locateFileInExplorer(tab.path)
      break
    case 'history':
      if (tab.path) {
        historyModalPath.value = tab.path
        showHistoryModal.value = true
      }
      break
    case 'share':
      if (tab.path) {
        shareUrl.value = `${window.location.origin}/?note=${encodeURIComponent(tab.path)}`
        showShareDialog.value = true
      }
      break
    case 'close':
      handleCloseTab(contextMenuTabId.value)
      break
    case 'close-others':
      closeOtherTabs(contextMenuTabId.value)
      break
    case 'close-all':
      closeAllTabs()
      break
  }
  
  showContextMenu.value = false
  contextMenuTabId.value = null
}

const handleHistoryRestored = async (restoredPath: string) => {
  if (!restoredPath) {
    console.warn('handleHistoryRestored called without path')
    return
  }
  
  console.log('Handling history restore for:', restoredPath)
  
  // Clear the modal path if it matches
  if (historyModalPath.value === restoredPath) {
    historyModalPath.value = null
  }
  
  // Wait a moment to ensure restore operation is complete
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Reload the note if it's currently selected or open in a tab
  const tabsStore = useTabsStore()
  const tab = tabsStore.getTabByPath(restoredPath)
  
  if (tab || vaultStore.selectedNotePath === restoredPath) {
    console.log('Reloading note after restore with cache bypass:', restoredPath)
    // Force reload the note with cache bypass to get the restored content
    // This will update selectedNote which triggers editor content update
    const success = await vaultStore.loadNote(restoredPath, true) // bypassCache = true
    if (success) {
      console.log('Note reloaded successfully after restore')
      // Verify the content was actually updated
      if (vaultStore.selectedNote?.path === restoredPath) {
        console.log('Verified note content updated:', vaultStore.selectedNote.content.substring(0, 50))
      }
    } else {
      console.error('Failed to reload note after restore')
    }
  } else {
    console.log('Note not currently open, skipping reload')
  }
}

const openTabInPopup = (path: string) => {
  // Encode the note path as a URL parameter
  const encodedPath = encodeURIComponent(path)
  const popupUrl = `/?popup=true&note=${encodedPath}`
  
  // Open popup window with appropriate features
  // Using a unique window name allows reusing the same popup window
  const windowName = `kbase-popup-${path.replace(/[^a-zA-Z0-9]/g, '-')}`
  
  const windowFeatures = [
    'width=1000',
    'height=700',
    'left=' + Math.round((screen.width - 1000) / 2),  // Center horizontally
    'top=' + Math.round((screen.height - 700) / 2),   // Center vertically
    'resizable=yes',
    'scrollbars=yes',
    'menubar=no',
    'toolbar=no',
    'status=no'
  ].join(',')
  
  const popupWindow = window.open(popupUrl, windowName, windowFeatures)
  
  // Handle popup blocker
  if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
    alert('Popup blocked. Please allow popups for this site to open notes in a new window.')
    return
  }
  
  // Focus the popup window
  popupWindow.focus()
}

const locateFileInExplorer = (path: string) => {
  if (!path) return
  
  // Expand the path to the file so it's visible in the tree
  vaultStore.expandToPath(path)
  
  // Wait for DOM to update (double nextTick to ensure Vue has rendered the expanded tree)
  nextTick(() => {
    nextTick(() => {
      // Find the file node element by data attribute
      const fileElement = document.querySelector(`[data-file-path="${path}"]`) as HTMLElement
      if (fileElement) {
        fileElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        
        // Add a temporary highlight effect to draw attention
        fileElement.style.transition = 'background-color 0.3s ease'
        const originalBg = fileElement.style.backgroundColor
        fileElement.style.backgroundColor = 'var(--bg-tertiary)'
        
        setTimeout(() => {
          fileElement.style.backgroundColor = originalBg || ''
          setTimeout(() => {
            fileElement.style.transition = ''
          }, 300)
        }, 1000)
      }
    })
  })
}

const closeOtherTabs = (keepTabId: string) => {
  const tabsToClose = tabsStore.tabs.filter(tab => tab.id !== keepTabId)
  tabsToClose.forEach(tab => {
    tabsStore.closeTab(tab.id)
  })
  
  // Ensure the kept tab is active
  tabsStore.setActiveTab(keepTabId)
  if (tabsStore.activeTabPath) {
    vaultStore.loadNote(tabsStore.activeTabPath)
  }
}

const closeAllTabs = () => {
  tabsStore.clearAllTabs()
  vaultStore.clearSelection()
}

// Watch for active tab changes to scroll into view
watch(activeTabId, (newId) => {
  if (newId && tabsContainerRef.value) {
    nextTick(() => {
      const activeTabElement = tabsContainerRef.value?.querySelector(
        `.tab.is-active`
      ) as HTMLElement
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }
    })
  }
})

// Update dropdown position when sidebar state changes
watch(() => vaultStore.isSidebarCollapsed, () => {
  if (showTabsDropdown.value) {
    updateDropdownPosition()
  }
})

// Update dropdown position on window resize
const handleResize = () => {
  if (showTabsDropdown.value) {
    updateDropdownPosition()
  }
}

// Handle paste events to prevent paste after middle-click
const handlePaste = (event: ClipboardEvent) => {
  // If we recently middle-clicked a tab, prevent paste
  if (preventPasteUntil && Date.now() < preventPasteUntil) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    return false
  }
}

// Setup click outside listener for dropdown
onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleResize)
    // Add paste event listener to prevent paste after middle-click
    document.addEventListener('paste', handlePaste, true) // Use capture phase
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('paste', handlePaste, true)
  }
})

// Expose handlers for testing
defineExpose({
  handleTabSelect,
  handleCloseTabFromDropdown
})
</script>

<style scoped>
.tabs-bar {
  position: fixed;
  top: 0;
  left: var(--toolbar-left);
  right: 0;
  z-index: 11;
  height: var(--tabs-bar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  transition: left 0.3s ease;
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

.tabs-container {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
  position: relative;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.tabs-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-width: 120px;
  max-width: 240px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
  position: relative;
  flex-shrink: 0;
}

.tab:hover {
  background: var(--bg-secondary);
}

.tab.is-active {
  background: var(--bg-primary);
  border-bottom: 2px solid #667eea;
}

.tab.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
  z-index: 1000;
  pointer-events: none;
}

.tab.is-drag-over {
  /* Remove the old left border indicator - we use drop indicator instead */
}

.tab-drop-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #667eea;
  z-index: 1001;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(102, 126, 234, 0.6);
  transform: translateX(-50%);
  animation: dropIndicatorPulse 1s ease-in-out infinite;
}

@keyframes dropIndicatorPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.tab-title {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}


.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
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

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tab-close:active {
  background: var(--border-color);
}

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
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

.tabs-dropdown-container {
  position: relative;
  display: flex;
  align-items: center;
}

.tabs-dropdown-btn {
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

.tabs-dropdown-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.tabs-dropdown-btn:active {
  transform: scale(0.98);
}

.tabs-dropdown-icon {
  font-size: 0.85rem;
  line-height: 1;
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

/* Responsive design */
@media (max-width: 768px) {
  .sidebar-toggle-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.25rem;
  }

  .tab {
    min-width: 100px;
    max-width: 180px;
    padding: 0.625rem 0.75rem;
  }

  .tab-title {
    font-size: 0.8125rem;
  }

  .tab-close {
    width: 24px;
    height: 24px;
    font-size: 1.75rem;
  }

  .editor-toggle-btn,
  .search-btn,
  .tabs-dropdown-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.125rem;
  }

  .editor-icon,
  .search-icon,
  .tabs-dropdown-icon {
    font-size: 1.125rem;
  }
}
</style>

