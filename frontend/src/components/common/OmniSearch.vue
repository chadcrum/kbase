<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="omni-search-overlay" @click="handleBackdropClick">
        <div class="omni-search-modal" @click.stop>
          <div class="search-input-container">
            <div class="search-icon">🔍</div>
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search notes..."
              @keydown.esc="close"
              @input="handleSearchInput"
            />
            <div v-if="isSearching" class="loading-spinner">⏳</div>
          </div>

          <div v-if="searchQuery && !isSearching && results.length === 0" class="no-results">
            No results found
          </div>

          <div v-if="results.length > 0" class="results-container">
            <div
              v-for="result in results"
              :key="result.path"
              class="result-item"
              @click="selectFile(result.path)"
            >
              <div class="result-icon">📄</div>
              <div class="result-info">
                <div class="result-name">{{ result.name }}</div>
                <div class="result-path">{{ result.path }}</div>
              </div>
            </div>
          </div>

          <div v-if="!searchQuery" class="search-hint">
            Type to search through your notes...
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { apiClient } from '@/api/client'
import { useVaultStore } from '@/stores/vault'
import type { SearchResult } from '@/types'

// Props
interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
}>()

// State
const searchQuery = ref('')
const results = ref<SearchResult[]>([])
const isSearching = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

// Debounce timer
let debounceTimer: number | null = null

// Vault store
const vaultStore = useVaultStore()

// Watch for modal open to focus input
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    await nextTick()
    searchInput.value?.focus()
    // Reset state when opening
    searchQuery.value = ''
    results.value = []
  } else {
    // Clear debounce timer when closing
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
})

// Handle search input with debouncing
const handleSearchInput = () => {
  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  const query = searchQuery.value.trim()

  // If empty query, clear results
  if (!query) {
    results.value = []
    isSearching.value = false
    return
  }

  // Set searching state
  isSearching.value = true

  // Debounce search (300ms)
  debounceTimer = window.setTimeout(async () => {
    await performSearch(query)
  }, 300)
}

// Perform the actual search
const performSearch = async (query: string) => {
  try {
    const response = await apiClient.searchNotes(query, 50)
    results.value = response.results
  } catch (error) {
    console.error('Search failed:', error)
    results.value = []
  } finally {
    isSearching.value = false
  }
}

// Select a file from results
const selectFile = (path: string) => {
  // Open the file
  vaultStore.selectNote(path)
  // Close the modal
  close()
}

// Close modal
const close = () => {
  emit('update:isOpen', false)
}

// Handle backdrop click
const handleBackdropClick = () => {
  close()
}
</script>

<style scoped>
.omni-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.omni-search-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-input-container {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  gap: 0.75rem;
}

.search-icon {
  font-size: 1.25rem;
  color: #667eea;
}

.search-input {
  flex: 1;
  font-size: 1rem;
  border: none;
  outline: none;
  background: transparent;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-input::placeholder {
  color: #9ca3af;
}

.loading-spinner {
  font-size: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.results-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-item:hover {
  background: linear-gradient(to right, #eef2ff, #e0e7ff);
  transform: translateX(2px);
}

.result-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-path {
  font-size: 0.8rem;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.125rem;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
}

.search-hint {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .omni-search-modal,
.modal-leave-active .omni-search-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .omni-search-modal,
.modal-leave-to .omni-search-modal {
  transform: translateY(-20px);
  opacity: 0;
}

/* Scrollbar styling */
.results-container::-webkit-scrollbar {
  width: 8px;
}

.results-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive design */
@media (max-width: 768px) {
  .omni-search-overlay {
    padding-top: 5vh;
  }

  .omni-search-modal {
    width: 95%;
    max-height: 80vh;
  }

  .search-input-container {
    padding: 0.75rem;
  }

  .result-item {
    padding: 0.6rem;
  }
}
</style>

