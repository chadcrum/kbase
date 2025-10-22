<template>
  <div class="toolbar">
    <div class="toolbar-buttons">
      <button @click="handleNewFolder" class="toolbar-button" title="New Folder">
        <span class="icon">📁</span>
      </button>
      <button @click="handleNewFile" class="toolbar-button" title="New File">
        <span class="icon">📄</span>
      </button>
      <button @click="handleRefresh" class="toolbar-button refresh-button" :disabled="isLoading" title="Refresh">
        <span class="icon refresh-icon">🔄</span>
      </button>
      
      <!-- Sort buttons -->
      <div class="sort-buttons">
        <button @click="handleToggleSortOrder" class="toolbar-button sort-button" :title="sortOrderTitle">
          <span class="icon">{{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}</span>
        </button>
        <div class="sort-dropdown-wrapper">
          <button @click="toggleSortDropdown" class="toolbar-button sort-button" title="Sort by">
            <span class="icon">⚙️</span>
          </button>
          <div v-if="showSortDropdown" class="sort-dropdown" @click.stop>
            <div 
              v-for="option in sortOptions" 
              :key="option.value"
              class="sort-option"
              :class="{ 'active': sortBy === option.value }"
              @click="handleSortByChange(option.value)"
            >
              <span class="sort-option-icon">{{ sortBy === option.value ? '✓' : '' }}</span>
              <span class="sort-option-label">{{ option.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="vaultStore.error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ vaultStore.error }}</span>
      <button @click="vaultStore.clearError()" class="error-close">×</button>
    </div>

    <!-- Input Dialog for New Folder -->
    <InputDialog
      :is-open="showFolderDialog"
      title="Create New Folder"
      message="Enter the folder name:"
      placeholder="folder-name"
      confirm-text="Create"
      :validator="validateFolderName"
      @confirm="createFolder"
      @cancel="showFolderDialog = false"
    />

    <!-- Input Dialog for New File -->
    <InputDialog
      :is-open="showFileDialog"
      title="Create New File"
      message="Enter the file name (with .md extension):"
      placeholder="file-name.md"
      confirm-text="Create"
      :validator="validateFileName"
      @confirm="createFile"
      @cancel="showFileDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVaultStore } from '@/stores/vault'
import InputDialog from '@/components/common/InputDialog.vue'
import type { SortBy } from '@/stores/vault'

// Props
defineProps<{
  isLoading: boolean
}>()

// Emits
const emit = defineEmits<{
  refresh: []
}>()

const vaultStore = useVaultStore()
const showFolderDialog = ref(false)
const showFileDialog = ref(false)
const showSortDropdown = ref(false)

// Sort state from store
const sortBy = computed(() => vaultStore.sortBy)
const sortOrder = computed(() => vaultStore.sortOrder)

// Sort options
const sortOptions = [
  { label: 'Name', value: 'name' as SortBy },
  { label: 'Created Date', value: 'created' as SortBy },
  { label: 'Modified Date', value: 'modified' as SortBy }
]

// Computed title for sort order button
const sortOrderTitle = computed(() => {
  return sortOrder.value === 'asc' ? 'Sort Ascending' : 'Sort Descending'
})

/**
 * Validates folder name to prevent path traversal and invalid characters
 * @param name - The folder name to validate
 * @returns Error message if invalid, null if valid
 */
const validateFolderName = (name: string): string | null => {
  // Check for empty name
  if (!name.trim()) {
    return 'Folder name cannot be empty'
  }

  // Check for path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return 'Folder name cannot contain path separators or ..'
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(name)) {
    return 'Folder name contains invalid characters'
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(name.toUpperCase())) {
    return 'This is a reserved folder name'
  }

  return null
}

/**
 * Validates file name to prevent path traversal and ensure .md extension
 * @param name - The file name to validate
 * @returns Error message if invalid, null if valid
 */
const validateFileName = (name: string): string | null => {
  // Check for empty name
  if (!name.trim()) {
    return 'File name cannot be empty'
  }

  // Check for path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return 'File name cannot contain path separators or ..'
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(name)) {
    return 'File name contains invalid characters'
  }

  // Ensure .md extension
  if (!name.endsWith('.md')) {
    return 'File name must end with .md extension'
  }

  // Check for reserved names (Windows)
  const baseName = name.replace(/\.md$/, '')
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(baseName.toUpperCase())) {
    return 'This is a reserved file name'
  }

  return null
}

/**
 * Opens the folder creation dialog
 */
const handleNewFolder = () => {
  showFolderDialog.value = true
}

/**
 * Opens the file creation dialog
 */
const handleNewFile = () => {
  showFileDialog.value = true
}

/**
 * Handles refresh button click
 */
const handleRefresh = () => {
  emit('refresh')
}

/**
 * Creates a new folder at the root level
 * @param folderName - The name of the folder to create
 */
const createFolder = async (folderName: string) => {
  const success = await vaultStore.createDirectory(folderName)
  if (success) {
    showFolderDialog.value = false
  }
  // Error handling is done by the store (sets error state)
}

/**
 * Creates a new file at the root level with empty content
 * @param fileName - The name of the file to create (must end with .md)
 */
const createFile = async (fileName: string) => {
  // Ensure .md extension (already validated, but being defensive)
  const fullFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`
  
  const success = await vaultStore.createNote(fullFileName)
  if (success) {
    showFileDialog.value = false
  }
  // Error handling is done by the store (sets error state)
}

/**
 * Toggles the sort order between ascending and descending
 */
const handleToggleSortOrder = () => {
  vaultStore.toggleSortOrder()
}

/**
 * Toggles the visibility of the sort dropdown
 */
const toggleSortDropdown = () => {
  showSortDropdown.value = !showSortDropdown.value
}

/**
 * Changes the sort criteria
 */
const handleSortByChange = (newSortBy: SortBy) => {
  vaultStore.setSortBy(newSortBy)
  showSortDropdown.value = false
}

/**
 * Close dropdown when clicking outside
 */
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.sort-dropdown-wrapper')) {
    showSortDropdown.value = false
  }
}

// Setup click outside listener
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-buttons {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #fef2f2;
  border-top: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.875rem;
}

.error-icon {
  font-size: 1rem;
}

.error-text {
  flex: 1;
}

.error-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #991b1b;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.error-close:hover {
  color: #7f1d1d;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.toolbar-button:active {
  background-color: #e5e7eb;
}

.toolbar-button .icon {
  font-size: 1rem;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  transition: transform 0.2s ease;
}

.refresh-button:hover:not(:disabled) .refresh-icon {
  transform: rotate(180deg);
}

/* Sort buttons */
.sort-buttons {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.sort-button {
  min-width: auto;
}

.sort-dropdown-wrapper {
  position: relative;
}

.sort-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
}

.sort-option:hover {
  background-color: #f3f4f6;
}

.sort-option.active {
  background-color: #eff6ff;
  color: #2563eb;
}

.sort-option-icon {
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
}

.sort-option-label {
  flex: 1;
}
</style>

