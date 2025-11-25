<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="close-btn" @click="handleClose">×</button>
          </div>
          
          <div class="modal-body">
            <p class="modal-message">Share this note with others using the link below:</p>
            <div class="input-group">
              <input
                ref="inputElement"
                :value="url"
                type="text"
                readonly
                class="modal-input"
                @click="selectAll"
              />
              <button class="btn btn-primary copy-btn" @click="copyToClipboard">
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

interface Props {
  isOpen: boolean
  url: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Share Note'
})

const emit = defineEmits<{
  close: []
}>()

const inputElement = ref<HTMLInputElement | null>(null)
const copied = ref(false)

const handleClose = () => {
  emit('close')
  copied.value = false
}

const selectAll = () => {
  inputElement.value?.select()
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      copied.value = false
    }, 2000)
    
    // Select the text again for visual feedback
    selectAll()
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isOpen) return
  
  if (event.key === 'Escape') {
    handleClose()
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    copied.value = false
    nextTick(() => {
      if (inputElement.value) {
        inputElement.value.focus()
        inputElement.value.select()
      }
    })
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 10px 25px var(--shadow);
  max-width: 500px;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-message {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.modal-input {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.modal-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 80px;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover {
  background-color: #5a67d8;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
