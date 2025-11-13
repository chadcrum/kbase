<template>
  <div
    class="resize-handle"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <div class="resize-handle-indicator"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useVaultStore } from '@/stores/vault'

const vaultStore = useVaultStore()

let isDragging = false
let startX = 0
let startWidth = 0

const startDrag = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  isDragging = true

  // Get starting position and width
  if (event.type === 'mousedown') {
    startX = (event as MouseEvent).clientX
  } else {
    startX = (event as TouchEvent).touches[0].clientX
  }
  startWidth = vaultStore.sidebarWidth

  // Add event listeners for dragging
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('touchmove', handleDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)

  // Add cursor style to body
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging) return

  event.preventDefault()

  let currentX = 0
  if (event.type === 'mousemove') {
    currentX = (event as MouseEvent).clientX
  } else {
    currentX = (event as TouchEvent).touches[0].clientX
  }

  // Calculate new width based on mouse/touch movement
  const deltaX = currentX - startX
  const newWidth = startWidth + deltaX

  // Update sidebar width (constraints are handled in the store)
  vaultStore.setSidebarWidth(newWidth)
}

const stopDrag = () => {
  if (!isDragging) return

  isDragging = false

  // Remove event listeners
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)

  // Reset cursor style
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Clean up event listeners on component unmount
onUnmounted(() => {
  if (isDragging) {
    stopDrag()
  }
})
</script>

<style scoped>
.resize-handle {
  width: 1px;
  background-color: var(--border-color);
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
  z-index: 1001; /* Higher than sidebar z-index */
  /* Expand hit area for easier dragging while keeping visual border thin */
  padding: 0 3px;
  margin: 0 -3px;
}

.resize-handle:hover {
  background-color: var(--accent-color);
}

.resize-handle:active,
.resize-handle.dragging {
  background-color: var(--accent-color);
}

.resize-handle-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1px;
  height: 20px;
  background-color: var(--text-secondary);
  border-radius: 0.5px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.resize-handle:hover .resize-handle-indicator {
  opacity: 1;
}

/* Touch-friendly on mobile */
@media (hover: none) and (pointer: coarse) {
  .resize-handle {
    width: 1px; /* Keep visual border super thin */
    /* Expand hit area for touch while keeping visual border thin */
    padding: 0 8px;
    margin: 0 -8px;
  }

  .resize-handle-indicator {
    opacity: 0.5;
  }
}
</style>
