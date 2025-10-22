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
import { ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import InputDialog from '@/components/common/InputDialog.vue'

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
</style>

