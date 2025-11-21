<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="preview-overlay" @click="handleClose">
        <div class="preview-container" @click.stop>
          <div class="preview-header">
            <button class="preview-btn preview-btn-close" @click="handleClose" title="Close">
              <span class="preview-btn-icon">✕</span>
            </button>
            <div class="preview-title">
              <div class="preview-name">{{ noteName }}</div>
              <div class="preview-path">{{ notePath }}</div>
            </div>
            <button class="preview-btn preview-btn-open" @click="handleOpen" title="Open note">
              <span class="preview-btn-icon">↗</span>
            </button>
          </div>
          
          <div class="preview-content-wrapper">
            <div v-if="isLoading" class="preview-loading">
              <div class="loading-spinner">⏳</div>
              <div>Loading note...</div>
            </div>
            <pre v-else class="preview-content">{{ noteContent }}</pre>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'
import { useVaultStore } from '@/stores/vault'

interface Props {
  isOpen: boolean
  notePath: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  open: [path: string]
}>()

const noteContent = ref('')
const isLoading = ref(false)

const vaultStore = useVaultStore()

const noteName = computed(() => {
  if (!props.notePath) return ''
  const parts = props.notePath.split('/')
  return parts[parts.length - 1] || props.notePath
})

const handleClose = () => {
  emit('close')
}

const handleOpen = () => {
  if (props.notePath) {
    emit('open', props.notePath)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isOpen) return
  
  if (event.key === 'Escape') {
    handleClose()
  }
}

const loadNoteContent = async () => {
  if (!props.notePath || !props.isOpen) {
    noteContent.value = ''
    return
  }

  isLoading.value = true
  try {
    const noteData = await apiClient.getNote(props.notePath)
    noteContent.value = noteData.content
  } catch (error) {
    console.error('Failed to load note preview:', error)
    noteContent.value = 'Error loading note content.'
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    loadNoteContent()
  } else {
    noteContent.value = ''
  }
})

watch(() => props.notePath, () => {
  if (props.isOpen) {
    loadNoteContent()
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.preview-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 25px 80px var(--shadow);
  width: 90vw;
  height: 90vh;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--border-color);
  min-height: 64px;
  gap: 1rem;
}

.preview-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preview-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-path {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 1.2rem;
}

.preview-btn:hover {
  background: var(--border-color);
  transform: scale(1.05);
}

.preview-btn:active {
  transform: scale(0.95);
}

.preview-btn:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.preview-btn-open {
  background: #667eea;
  color: white;
}

.preview-btn-open:hover {
  background: #5a67d8;
}

.preview-btn-icon {
  line-height: 1;
}

.preview-content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.preview-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling */
.preview-content::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.preview-content::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.preview-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 6px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .preview-container,
.modal-leave-active .preview-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .preview-container,
.modal-leave-to .preview-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .preview-container {
    width: 95vw;
    height: 85vh;
    max-width: 95vw;
    max-height: 85vh;
    border-radius: 12px;
  }

  .preview-header {
    padding: 0.75rem 1rem;
    min-height: 56px;
  }

  .preview-name {
    font-size: 1rem;
  }

  .preview-path {
    font-size: 0.75rem;
  }

  .preview-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .preview-content {
    padding: 1rem;
    font-size: 0.85rem;
  }
}
</style>

