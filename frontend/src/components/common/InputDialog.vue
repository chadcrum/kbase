<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
          </div>
          
          <div class="modal-body">
            <p v-if="message" class="modal-message">{{ message }}</p>
            <input
              ref="inputElement"
              v-model="inputValue"
              type="text"
              class="modal-input"
              :placeholder="placeholder"
              @keydown.enter="handleConfirm"
              @keydown.esc="handleCancel"
            />
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          </div>
          
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="handleCancel"
              @keydown.enter="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="btn btn-primary"
              @click="handleConfirm"
              @keydown.enter="handleConfirm"
              :disabled="!inputValue.trim()"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  isOpen: boolean
  title: string
  message?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  defaultValue?: string
  validator?: (value: string) => string | null
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  placeholder: '',
  confirmText: 'Create',
  cancelText: 'Cancel',
  defaultValue: '',
  validator: () => null
})

const emit = defineEmits<{
  confirm: [value: string]
  cancel: []
}>()

const inputElement = ref<HTMLInputElement | null>(null)
const inputValue = ref(props.defaultValue)
const errorMessage = ref<string | null>(null)

const handleConfirm = () => {
  const trimmedValue = inputValue.value.trim()
  if (!trimmedValue) return

  // Validate input
  if (props.validator) {
    const error = props.validator(trimmedValue)
    if (error) {
      errorMessage.value = error
      return
    }
  }

  emit('confirm', trimmedValue)
  inputValue.value = ''
  errorMessage.value = null
}

const handleCancel = () => {
  emit('cancel')
  inputValue.value = props.defaultValue
  errorMessage.value = null
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.isOpen) return
  
  if (event.key === 'Escape') {
    handleCancel()
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Reset input value and focus input when modal opens
    inputValue.value = props.defaultValue
    errorMessage.value = null
    setTimeout(() => {
      inputElement.value?.focus()
    }, 100)
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.modal-message {
  margin: 0 0 1rem 0;
  color: #4b5563;
  line-height: 1.6;
}

.modal-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.modal-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  margin: 0.5rem 0 0 0;
  color: #ef4444;
  font-size: 0.875rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
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

