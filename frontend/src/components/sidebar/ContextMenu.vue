<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="context-menu"
      :style="{ top: y + 'px', left: x + 'px' }"
      ref="menuRef"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        class="context-menu-item"
        :class="{ 'is-danger': item.isDanger }"
        @click="handleItemClick(item)"
      >
        <span class="menu-icon">{{ item.icon }}</span>
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  action: string
  isDanger?: boolean
}

interface Props {
  x: number
  y: number
  isOpen: boolean
  items: ContextMenuItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  select: [action: string]
}>()

const menuRef = ref<HTMLDivElement | null>(null)

const handleItemClick = (item: ContextMenuItem) => {
  emit('select', item.action)
  emit('close')
}

const handleClickOutside = (event: MouseEvent) => {
  if (!props.isOpen) return
  
  const target = event.target as Node
  if (menuRef.value && !menuRef.value.contains(target)) {
    emit('close')
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (props.isOpen && event.key === 'Escape') {
    emit('close')
  }
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Adjust position if menu goes off screen
    setTimeout(() => {
      if (!menuRef.value) return
      
      const rect = menuRef.value.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        menuRef.value.style.left = `${viewportWidth - rect.width - 10}px`
      }
      
      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        menuRef.value.style.top = `${viewportHeight - rect.height - 10}px`
      }
    }, 0)
  }
})

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.25rem;
  min-width: 180px;
  z-index: 9999;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  font-size: 0.875rem;
  color: #374151;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.context-menu-item.is-danger {
  color: #dc2626;
}

.context-menu-item.is-danger:hover {
  background-color: #fee2e2;
}

.menu-icon {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
  white-space: nowrap;
}
</style>

