<template>
  <div class="milkdown-editor-container">
    <!-- WYSIWYG Editor -->
    <div ref="milkdownRef" class="milkdown-editor">
      <div v-if="loading" class="loading">Loading editor...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useThemeStore } from '@/stores/theme'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { nord } from '@milkdown/theme-nord'
import { listenerCtx, listener } from '@milkdown/plugin-listener'

// Props
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
}>()

// Stores
const vaultStore = useVaultStore()
const themeStore = useThemeStore()

// Refs
const milkdownRef = ref<HTMLElement | null>(null)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let editor: Editor | null = null
let loading = ref(true)

// Debounce delay for auto-save (1 second) - same as Monaco/TipTap
const AUTO_SAVE_DELAY = 1000

// Local content state
const localContent = ref(props.modelValue)

// Initialize Milkdown editor directly
const initializeEditor = async () => {
  if (!milkdownRef.value) return

  try {
    loading.value = true
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, milkdownRef.value!)
        ctx.set(defaultValueCtx, props.modelValue)
        ctx.set(editorViewOptionsCtx, {
          editable: () => !props.disabled && !props.readonly
        })
        nord(ctx)
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create()
    
    // Listen to content changes for auto-save
    editor.action((ctx) => {
      const listener = ctx.get(listenerCtx)
      listener.markdownUpdated((ctx, markdown) => {
        if (props.disabled) return
        
        localContent.value = markdown
        
        // Emit update for v-model
        emit('update:modelValue', markdown)
        
        // Debounced auto-save
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }
        
        saveTimeout = setTimeout(() => {
          emit('save', markdown)
        }, AUTO_SAVE_DELAY)
      })
    })
    
    loading.value = false
  } catch (error) {
    console.error('Failed to initialize Milkdown editor:', error)
    loading.value = false
  }
}

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue
  }
})

// Watch for path changes (note switching)
watch(() => props.path, async () => {
  // Force content update when switching notes
  await nextTick()
  localContent.value = props.modelValue
})

// Lifecycle hooks
onMounted(async () => {
  // Initialize Milkdown editor
  await nextTick()
  await initializeEditor()
})

onBeforeUnmount(() => {
  // Clear save timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  // Dispose editor
  if (editor) {
    editor.destroy()
    editor = null
  }
})
</script>

<style scoped>
.milkdown-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.milkdown-editor {
  width: 100%;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Milkdown editor styling */
:deep(.milkdown) {
  height: 100%;
  background: transparent;
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.milkdown .editor) {
  height: 100%;
  outline: none;
}

:deep(.milkdown .editor:focus) {
  outline: none;
}

/* Milkdown theme customization */
:deep(.milkdown .prose) {
  color: var(--text-primary);
}

:deep(.milkdown .prose h1),
:deep(.milkdown .prose h2),
:deep(.milkdown .prose h3),
:deep(.milkdown .prose h4),
:deep(.milkdown .prose h5),
:deep(.milkdown .prose h6) {
  color: var(--text-primary);
  border-color: var(--border-color);
}

:deep(.milkdown .prose blockquote) {
  border-left-color: var(--accent-color);
  background: var(--bg-secondary);
}

:deep(.milkdown .prose code) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

:deep(.milkdown .prose pre) {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

:deep(.milkdown .prose table) {
  border-color: var(--border-color);
}

:deep(.milkdown .prose th),
:deep(.milkdown .prose td) {
  border-color: var(--border-color);
}

:deep(.milkdown .prose th) {
  background: var(--bg-secondary);
}
</style>