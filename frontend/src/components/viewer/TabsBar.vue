<template>
  <div class="tabs-bar" :style="{ '--toolbar-left': toolbarLeft }">
    <div class="tabs-container" ref="tabsContainerRef">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :data-tab-id="tab.id"
        :class="{
          'is-active': tab.id === activeTabId,
          'is-pinned': tab.isPinned,
          'is-dragging': draggingTabId === tab.id,
          'is-drag-over': dragOverTabId === tab.id
        }"
        draggable="true"
        @click="handleTabClick(tab.id)"
        @dblclick="handleTabDoubleClick(tab.id)"
        @dragstart="handleDragStart($event, tab.id)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, tab.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, tab.id)"
        @touchstart="handleTouchStart($event, tab.id)"
        @touchmove="handleTouchMove($event)"
        @touchend="handleTouchEnd"
      >
        <span class="tab-title" :class="{ 'is-italic': !tab.isPinned }">
          {{ tab.title }}
        </span>
        <button
          class="tab-close"
          @click.stop="handleCloseTab(tab.id)"
          :title="'Close tab'"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'

// Store
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()

// Refs
const tabsContainerRef = ref<HTMLElement | null>(null)

// State for long-press detection (mobile pinning)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let currentLongPressTabId: string | null = null
const LONG_PRESS_DURATION = 500 // ms

// State for drag and drop (desktop only)
let draggingTabId: string | null = null
let dragOverTabId: string | null = null
let dragStartIndex = -1
let dragOverIndex = -1

// Computed
const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

const toolbarLeft = computed(() => {
  return vaultStore.isSidebarCollapsed ? '0px' : `${vaultStore.sidebarWidth}px`
})

// Methods
const handleTabClick = (id: string) => {
  const tab = tabsStore.tabs.find(t => t.id === id)
  if (tab) {
    tabsStore.setActiveTab(id)
    vaultStore.loadNote(tab.path)
  }
}

const handleTabDoubleClick = (id: string) => {
  tabsStore.togglePinTab(id)
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
}

const handleDragOver = (event: DragEvent, tabId: string) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'

  if (draggingTabId && draggingTabId !== tabId) {
    dragOverTabId = tabId
    dragOverIndex = tabsStore.tabs.findIndex(tab => tab.id === tabId)
  } else {
    dragOverTabId = null
    dragOverIndex = -1
  }
}

const handleDragLeave = (event: DragEvent) => {
  // Only clear if we're actually leaving the tab (not entering a child element)
  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
    dragOverTabId = null
    dragOverIndex = -1
  }
}

const handleDrop = (event: DragEvent, tabId: string) => {
  event.preventDefault()

  if (draggingTabId && draggingTabId !== tabId && dragStartIndex !== -1 && dragOverIndex !== -1) {
    tabsStore.reorderTabs(dragStartIndex, dragOverIndex)
  }

  handleDragEnd()
}

// Touch handlers for mobile (simplified - just long press for pinning, no drag)
const handleTouchStart = (event: TouchEvent, tabId: string) => {
  // Only start long press if not on close button
  if ((event.target as HTMLElement).closest('.tab-close')) {
    return
  }

  // Clear any existing timer
  if (longPressTimer) {
    clearTimeout(longPressTimer)
  }

  // Set up long press for pinning
  currentLongPressTabId = tabId
  longPressTimer = setTimeout(() => {
    if (currentLongPressTabId === tabId) {
      tabsStore.togglePinTab(tabId)
      currentLongPressTabId = null
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
}

const handleTouchMove = () => {
  // Cancel long press if user starts moving (prevents accidental pinning during scroll)
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  currentLongPressTabId = null
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

// Cleanup on unmount
onBeforeUnmount(() => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
  }
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
  align-items: stretch;
  transition: left 0.3s ease;
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
  border-left: 2px solid #667eea;
  margin-left: -2px;
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

.tab-title.is-italic {
  font-style: italic;
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

/* Responsive design */
@media (max-width: 768px) {
  .tab {
    min-width: 100px;
    max-width: 180px;
    padding: 0.5rem 0.625rem;
  }

  .tab-title {
    font-size: 0.8125rem;
  }

  .tab-close {
    width: 20px;
    height: 20px;
    font-size: 1.5rem;
  }
}
</style>

