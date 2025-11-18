<template>
  <!-- Popup mode: render NoteViewer directly without AppLayout -->
  <div v-if="isPopupMode" class="popup-container">
    <NoteViewer :is-popup="true" @open-search="isOmniSearchOpen = true" />
    <OmniSearch v-model:isOpen="isOmniSearchOpen" />
  </div>
  <!-- Normal mode: render with AppLayout -->
  <AppLayout v-else>
    <NoteViewer @open-search="isOmniSearchOpen = true" />
    <OmniSearch v-model:isOpen="isOmniSearchOpen" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import AppLayout from '@/components/layout/AppLayout.vue'
import NoteViewer from '@/components/viewer/NoteViewer.vue'
import OmniSearch from '@/components/common/OmniSearch.vue'

// Router
const route = useRoute()

// Store
const vaultStore = useVaultStore()
const tabsStore = useTabsStore()

// State
const isOmniSearchOpen = ref(false)

// Check if we're in popup mode
const isPopupMode = computed(() => {
  return route.query.popup === 'true'
})

// Get note path from query parameter
const notePathFromQuery = computed(() => {
  const noteParam = route.query.note
  if (typeof noteParam === 'string') {
    return decodeURIComponent(noteParam)
  }
  return null
})

// Load note from query parameter when in popup mode
watch([isPopupMode, notePathFromQuery], async ([popupMode, notePath]) => {
  if (popupMode && notePath) {
    // Ensure file tree is loaded first
    if (!vaultStore.fileTree) {
      await vaultStore.loadFileTree()
    }
    // Load the note without broadcasting (popup windows shouldn't affect primary window)
    await vaultStore.selectNote(notePath, false)
    // Update document title
    document.title = `${getNoteTitle(notePath)} - KBase`
  }
}, { immediate: true })

// Update document title when selected note changes in popup mode
watch(() => vaultStore.selectedNotePath, (newPath) => {
  if (isPopupMode.value && newPath) {
    document.title = `${getNoteTitle(newPath)} - KBase`
  }
})

// Locate file in explorer (same logic as in TabsBar)
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

// Keyboard shortcut handler
const handleKeyDown = (event: KeyboardEvent) => {
  // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac) - Open search
  if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
    event.preventDefault()
    isOmniSearchOpen.value = true
  }
  
  // Check for Ctrl+L (Windows/Linux) or Cmd+L (Mac) - Locate file in explorer
  if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
    event.preventDefault()
    // Get the currently active tab's path, or fall back to selected note path
    const activePath = tabsStore.activeTabPath || vaultStore.selectedNotePath
    if (activePath) {
      locateFileInExplorer(activePath)
    }
  }
}

// Helper function to get note title
const getNoteTitle = (path: string): string => {
  const parts = path.split('/')
  const filename = parts[parts.length - 1]
  if (filename.endsWith('.md')) {
    return filename.slice(0, -3)
  }
  return filename || 'Untitled'
}

// Setup keyboard listener
onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  
  // Enhance popup mode experience
  if (isPopupMode.value) {
    // Update document title to show note name
    if (notePathFromQuery.value) {
      document.title = `${getNoteTitle(notePathFromQuery.value)} - KBase`
    } else {
      document.title = 'KBase Note'
    }
  }
  
  // Load note from query parameter if in popup mode
  if (isPopupMode.value && notePathFromQuery.value) {
    // Ensure file tree is loaded first
    if (!vaultStore.fileTree) {
      await vaultStore.loadFileTree()
    }
    // Load the note without broadcasting (popup windows shouldn't affect primary window)
    await vaultStore.selectNote(notePathFromQuery.value, false)
  }
})

// Cleanup keyboard listener
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.popup-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}
</style>

