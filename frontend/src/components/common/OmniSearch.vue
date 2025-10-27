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
              @keydown="handleKeyDown"
              @input="handleSearchInput"
            />
            <div v-if="isSearching" class="loading-spinner">⏳</div>
          </div>

          <div v-if="searchQuery && !isSearching && results.length === 0" class="no-results">
            No results found
          </div>

          <div v-if="results.length > 0" class="results-container">
            <div
              v-for="(result, index) in results"
              :key="result.path"
              :class="['result-item', { selected: index === selectedIndex }]"
              @click="selectFile(result.path)"
            >
              <div class="result-icon">📄</div>
              <div class="result-info">
                <div class="result-name">{{ result.name }}</div>
                <div class="result-path">{{ result.path }}</div>
                <div v-if="result.snippets && result.snippets.length > 0" class="result-snippets">
                  <div
                    v-for="snippet in result.snippets"
                    :key="`${result.path}-${snippet.line_number}`"
                    class="snippet-line"
                  >
                    <span class="snippet-line-number">{{ snippet.line_number }}</span>
                    <span class="snippet-content" v-html="getHighlightedContent(snippet.content)"></span>
                  </div>
                </div>
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
import { highlightSearchTerms } from '@/utils/highlightSearch'

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
const selectedIndex = ref(0)

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
    selectedIndex.value = 0
  } else {
    // Clear debounce timer when closing
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
})

// Watch results to auto-select first item
watch(results, (newResults) => {
  if (newResults.length > 0) {
    selectedIndex.value = 0
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

// Highlight search terms in snippet content
const getHighlightedContent = (content: string): string => {
  return highlightSearchTerms(content, searchQuery.value)
}

// Handle keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle arrow keys and Enter when there are results
  if (results.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    // Wrap around to first item
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length
    scrollSelectedIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    // Wrap around to last item
    selectedIndex.value = selectedIndex.value === 0 
      ? results.value.length - 1 
      : selectedIndex.value - 1
    scrollSelectedIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    // Select the currently highlighted result
    const selectedResult = results.value[selectedIndex.value]
    if (selectedResult) {
      selectFile(selectedResult.path)
    }
  }
}

// Scroll selected item into view
const scrollSelectedIntoView = () => {
  nextTick(() => {
    const selected = document.querySelector('.result-item.selected')
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
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
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 20px 60px var(--shadow);
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
  border-bottom: 2px solid var(--border-color);
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
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-input::placeholder {
  color: var(--text-tertiary);
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

.result-item.selected {
  background: var(--bg-tertiary);
  border-left: 3px solid #667eea;
  padding-left: calc(0.75rem - 3px);
}

.result-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.result-item.selected:hover {
  background: var(--border-color);
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
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-path {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.125rem;
}

.result-snippets {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.snippet-line {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border-left: 2px solid var(--border-color);
}

.snippet-line-number {
  color: var(--text-tertiary);
  font-weight: 600;
  min-width: 2.5rem;
  text-align: right;
  flex-shrink: 0;
  user-select: none;
}

.snippet-content {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-content :deep(mark) {
  background-color: #fef08a;
  color: #713f12;
  font-weight: 600;
  padding: 0.1rem 0.2rem;
  border-radius: 2px;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.search-hint {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
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
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.results-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Responsive design */
@media (max-width: 768px) {
  .omni-search-overlay {
    padding-top: 5vh;
    padding-left: 0;
    padding-right: 0;
  }

  .omni-search-modal {
    width: 100%;
    max-height: 85vh;
    border-radius: 16px 16px 0 0;
  }

  .search-input-container {
    padding: 1rem;
  }

  .search-input {
    font-size: 16px; /* Prevent zoom on iOS */
    padding: 12px;
  }

  .result-item {
    padding: 12px;
    min-height: 56px;
  }

  .result-filename {
    font-size: 15px;
  }

  .result-snippet {
    font-size: 13px;
    line-height: 1.4;
  }

  .result-highlight {
    padding: 2px 4px;
  }

  .result-path {
    font-size: 12px;
  }
}
</style>

