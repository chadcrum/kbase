<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="onCancel">
        <div class="modal-container" role="dialog" aria-modal="true" @click.stop>
          <header class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <p v-if="message" class="modal-subtitle">{{ message }}</p>
          </header>

          <section class="modal-body">
            <div class="directory-list" role="tree">
              <div
                v-for="entry in visibleDirectories"
                :key="entry.path"
                class="directory-row"
                :class="{
                  'is-selected': entry.path === selectedPath,
                  'is-disabled': isPathDisabled(entry.path)
                }"
                :style="{ paddingLeft: entry.level * 20 + 'px' }"
                role="treeitem"
                :aria-level="entry.level + 1"
                :aria-expanded="entry.hasChildren ? isExpanded(entry.path) : undefined"
                :aria-selected="entry.path === selectedPath"
                @click="onSelect(entry.path)"
                @dblclick="attemptConfirm(entry.path)"
              >
                <button
                  v-if="entry.hasChildren"
                  class="expand-toggle"
                  type="button"
                  :aria-label="isExpanded(entry.path) ? 'Collapse' : 'Expand'"
                  @click.stop="toggleExpand(entry.path)"
                >
                  {{ isExpanded(entry.path) ? '▾' : '▸' }}
                </button>
                <span v-else class="expand-placeholder"></span>

                <span class="directory-icon">📁</span>
                <span class="directory-name">{{ entry.displayName }}</span>
                <span v-if="entry.isDisallowed" class="disabled-hint">Not allowed</span>
              </div>
            </div>
          </section>

          <footer class="modal-footer">
            <button class="btn btn-secondary" type="button" @click="onCancel">Cancel</button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!canConfirm"
              @click="confirmSelection"
            >
              Move Here
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { useVaultStore } from '@/stores/vault'
import type { FileTreeNode } from '@/types'

interface DirectoryEntry {
  path: string
  displayName: string
  level: number
  hasChildren: boolean
  isDisallowed: boolean
}

const props = withDefaults(defineProps<{
  isOpen: boolean
  currentPath: string
  initialDirectory?: string
  disallowedPaths?: string[]
  title?: string
  message?: string
}>(), {
  initialDirectory: '',
  disallowedPaths: () => [],
  title: 'Move Item',
  message: ''
})

const emit = defineEmits<{
  confirm: [destination: string]
  cancel: []
}>()

const vaultStore = useVaultStore()

const expandedPaths = ref<Set<string>>(new Set(['/']))
const selectedPathRef = ref<string>('/')

const disabledPathSet = computed(() => {
  const set = new Set<string>(props.disallowedPaths)
  set.add(props.currentPath)
  return set
})

const selectedPath = computed({
  get: () => selectedPathRef.value,
  set: (value: string) => {
    selectedPathRef.value = value
  }
})

const rootDisplayName = computed(() => {
  const tree = vaultStore.sortedFileTree
  if (tree?.name && tree.name !== '/') {
    return tree.name
  }
  return '/'
})

const visibleDirectories = computed<DirectoryEntry[]>(() => {
  const entries: DirectoryEntry[] = []
  const tree = vaultStore.sortedFileTree
  if (!tree) {
    return entries
  }

  const pushEntry = (node: FileTreeNode, level: number) => {
    if (node.type !== 'directory') {
      return
    }

    const path = normalizePath(node.path)
    const displayName = path === '/' ? rootDisplayName.value : node.name || '/'
    const hasChildDirectories = Boolean(node.children?.some(child => child.type === 'directory'))
    const isDisallowed = disabledPathSet.value.has(path)

    entries.push({
      path,
      displayName,
      level,
      hasChildren: hasChildDirectories,
      isDisallowed
    })

    if (!hasChildDirectories) {
      return
    }

    if (isExpanded(path)) {
      node.children
        ?.filter(child => child.type === 'directory')
        .forEach(child => pushEntry(child, level + 1))
    }
  }

  pushEntry(tree, 0)
  return entries
})

const canConfirm = computed(() => {
  return selectedPath.value !== '' && !isPathDisabled(selectedPath.value)
})

const normalizePath = (path: string): string => {
  if (!path) return '/'
  if (path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

const getParentPath = (path: string): string => {
  const normalized = normalizePath(path)
  if (normalized === '/') {
    return '/'
  }

  const segments = normalized.split('/').filter(Boolean)
  if (segments.length <= 1) {
    return '/'
  }

  segments.pop()
  return `/${segments.join('/')}`
}

const expandAncestors = (path: string) => {
  const normalized = normalizePath(path)
  if (normalized === '/') {
    expandedPaths.value.add('/')
    return
  }

  const segments = normalized.split('/').filter(Boolean)
  let current = ''
  expandedPaths.value.add('/')
  segments.forEach(segment => {
    current += `/${segment}`
    expandedPaths.value.add(current)
  })
}

const resetState = () => {
  expandedPaths.value = new Set(['/'])
  const defaultSelection = props.initialDirectory
    ? normalizePath(props.initialDirectory)
    : getParentPath(props.currentPath)

  if (isPathDisabled(defaultSelection)) {
    selectedPath.value = '/'
  } else {
    selectedPath.value = defaultSelection
  }

  expandAncestors(selectedPath.value)
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetState()
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) return

  if (event.key === 'Escape') {
    onCancel()
  } else if (event.key === 'Enter') {
    confirmSelection()
  }
}

const isExpanded = (path: string): boolean => {
  return expandedPaths.value.has(path)
}

const toggleExpand = (path: string) => {
  const set = new Set(expandedPaths.value)
  if (set.has(path)) {
    if (path !== '/') {
      set.delete(path)
    }
  } else {
    set.add(path)
  }
  expandedPaths.value = set
}

const isPathDisabled = (path: string): boolean => {
  return disabledPathSet.value.has(path)
}

const onSelect = (path: string) => {
  if (isPathDisabled(path)) {
    return
  }
  selectedPath.value = path
}

const attemptConfirm = (path: string) => {
  if (isPathDisabled(path)) {
    return
  }
  selectedPath.value = path
  confirmSelection()
}

const confirmSelection = () => {
  if (!canConfirm.value) {
    return
  }
  emit('confirm', selectedPath.value)
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  width: min(480px, 90vw);
  max-height: min(540px, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-subtitle {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.modal-body {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.directory-list {
  padding: 0.5rem 0;
}

.directory-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1.25rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.directory-row:hover:not(.is-disabled) {
  background-color: var(--bg-tertiary);
}

.directory-row.is-selected {
  background-color: rgba(102, 126, 234, 0.15);
}

.directory-row.is-disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.directory-row.is-disabled .directory-name {
  opacity: 0.75;
}

.expand-toggle {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.expand-toggle:hover {
  color: var(--text-primary);
}

.expand-placeholder {
  width: 1.25rem;
  height: 1.25rem;
}

.directory-icon {
  width: 1.5rem;
  text-align: center;
}

.directory-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disabled-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.modal-footer {
  border-top: 1px solid var(--border-color);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  background-color: #5a67d8;
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background-color: var(--border-color);
}

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
  transform: translateY(12px);
}
</style>


