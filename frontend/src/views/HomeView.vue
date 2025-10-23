<template>
  <AppLayout>
    <NoteViewer @open-search="isOmniSearchOpen = true" />
    <OmniSearch v-model:isOpen="isOmniSearchOpen" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import NoteViewer from '@/components/viewer/NoteViewer.vue'
import OmniSearch from '@/components/common/OmniSearch.vue'

// State
const isOmniSearchOpen = ref(false)

// Keyboard shortcut handler
const handleKeyDown = (event: KeyboardEvent) => {
  // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
    event.preventDefault()
    isOmniSearchOpen.value = true
  }
}

// Setup keyboard listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

// Cleanup keyboard listener
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

