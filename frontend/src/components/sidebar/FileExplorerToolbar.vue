<template>
  <div class="toolbar">
    <div class="toolbar-menu">
      <button
        @click="toggleMenu"
        class="toolbar-button toolbar-menu-trigger"
        title="File Explorer actions"
        aria-haspopup="true"
        :aria-expanded="showMenu.toString()"
      >
        <span class="icon">☰</span>
      </button>
      <div
        v-if="showMenu"
        class="toolbar-dropdown"
        role="menu"
      >
        <button class="toolbar-dropdown-item" role="menuitem" @click="handleNewFolder">
          <span class="icon">📁</span>
          <span class="label">New Folder</span>
        </button>
        <button class="toolbar-dropdown-item" role="menuitem" @click="handleNewFile">
          <span class="icon">📄</span>
          <span class="label">New File</span>
        </button>
        <button
          class="toolbar-dropdown-item"
          role="menuitem"
          @click="handleRefresh"
          :disabled="isLoading"
        >
          <span class="icon">🔄</span>
          <span class="label">Refresh</span>
        </button>

        <div class="toolbar-dropdown-divider" role="separator"></div>

        <button class="toolbar-dropdown-item" role="menuitem" @click="handleToggleSortOrder">
          <span class="icon">{{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}</span>
          <span class="label">{{ sortOrderTitle }}</span>
        </button>

        <div class="toolbar-dropdown-subheader">Sort by</div>
        <button
          v-for="option in sortOptions"
          :key="`sort-${option.value}`"
          class="toolbar-dropdown-item"
          role="menuitemradio"
          :aria-checked="(sortBy === option.value).toString()"
          :class="{ active: sortBy === option.value }"
          @click="handleSortByChange(option.value)"
        >
          <span class="icon">{{ sortBy === option.value ? '✓' : '' }}</span>
          <span class="label">{{ option.label }}</span>
        </button>

        <div class="toolbar-dropdown-divider" role="separator"></div>

        <button
          class="toolbar-dropdown-item"
          role="menuitem"
          @click="handleCollapseAll"
          :disabled="!hasExpandedPaths"
        >
          <span class="icon">⬇️</span>
          <span class="label">Collapse All</span>
        </button>

        <div class="toolbar-dropdown-divider" role="separator"></div>

        <div class="toolbar-dropdown-subheader">Application</div>
        <button
          class="toolbar-dropdown-item theme-toggle-btn"
          role="menuitem"
          @click="handleToggleTheme"
        >
          <span class="icon">{{ themeIcon }}</span>
          <span class="label">{{ themeToggleLabel }}</span>
        </button>

        <button
          class="toolbar-dropdown-item logout-btn"
          role="menuitem"
          @click="handleLogout"
        >
          <span class="icon">🚪</span>
          <span class="label">Logout</span>
        </button>
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
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
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
const authStore = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()
const showFolderDialog = ref(false)
const showFileDialog = ref(false)
const showMenu = ref(false)

/**
 * Closes the toolbar menu if open
 */
const closeMenu = () => {
  showMenu.value = false
}

// Sort state from store
const sortBy = computed(() => vaultStore.sortBy)
const sortOrder = computed(() => vaultStore.sortOrder)

// Collapse/Expand all state
const hasExpandedPaths = computed(() => vaultStore.hasExpandedPaths)

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

const themeIcon = computed(() => {
  return themeStore.isDarkMode ? '🌙' : '☀️'
})

const themeToggleLabel = computed(() => {
  return themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
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
  closeMenu()
}

/**
 * Opens the file creation dialog
 */
const handleNewFile = () => {
  showFileDialog.value = true
  closeMenu()
}

/**
 * Handles refresh button click
 */
const handleRefresh = () => {
  emit('refresh')
  closeMenu()
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
  closeMenu()
}

/**
 * Changes the sort criteria
 */
const handleSortByChange = (newSortBy: SortBy) => {
  vaultStore.setSortBy(newSortBy)
  closeMenu()
}

/**
 * Collapses all expanded directories
 */
const handleCollapseAll = () => {
  vaultStore.collapseAll()
  closeMenu()
}

/**
 * Handles theme toggle action
 */
const handleToggleTheme = () => {
  themeStore.toggleTheme()
  closeMenu()
}

/**
 * Logs user out and redirects to login
 */
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  closeMenu()
}

/**
 * Close dropdown when clicking outside
 */
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.toolbar-menu')) {
    showMenu.value = false
  }
}

/**
 * Toggles the menu visibility
 */
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

// Setup listeners
onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }

  if (typeof window === 'undefined') {
    return
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }

  if (typeof window === 'undefined') {
    return
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.toolbar-menu {
  position: relative;
  display: inline-block;
  padding: 0.5rem 0.75rem;
}

.toolbar-menu-trigger {
  min-width: 40px;
  min-height: 40px;
}

.toolbar-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 10px 20px -10px var(--shadow);
  padding: 0.5rem 0;
  z-index: 1000;
}

.toolbar-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-size: 0.9rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-dropdown-item .icon {
  width: 1.25rem;
  text-align: center;
}

.toolbar-dropdown-item .label {
  flex: 1;
}

.toolbar-dropdown-item:hover:not(:disabled),
.toolbar-dropdown-item.active {
  background-color: var(--bg-tertiary);
}

.toolbar-dropdown-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-dropdown-subheader {
  padding: 0.35rem 1rem 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.toolbar-dropdown-divider {
  height: 1px;
  margin: 0.4rem 0;
  background-color: var(--border-color);
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
  padding: 0.4rem 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--text-tertiary);
}

.toolbar-button:active {
  background-color: var(--border-color);
}

.toolbar-button .icon {
  font-size: 0.85rem;
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

/* Touch device accessibility */
@media (hover: none) and (pointer: coarse) {
  .toolbar-button {
    min-width: 40px;
    min-height: 40px;
    padding: 0.375rem 0.5rem;
  }

  .toolbar-button .icon {
    font-size: 0.875rem;
  }
}
</style>

