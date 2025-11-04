<template>
  <div ref="editorContainer" class="milkdown-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import { useThemeStore } from '@/stores/theme'

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

// Store
const themeStore = useThemeStore()

// Refs
const editorContainer = ref<HTMLElement | null>(null)
let editor: Editor | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let currentMarkdown = ref<string>(props.modelValue)

// Debounce delay for auto-save (1 second)
const AUTO_SAVE_DELAY = 1000

// Handle content change
const handleContentChange = (markdown: string) => {
  if (props.disabled) return
  
  currentMarkdown.value = markdown
  
  // Emit update for v-model
  emit('update:modelValue', markdown)
  
  // Debounced auto-save
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    emit('save', markdown)
  }, AUTO_SAVE_DELAY)
}

// Initialize Milkdown editor
onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // Create editor instance
    editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer.value!)
        ctx.set(defaultValueCtx, props.modelValue)
        
        // Configure listener for content changes
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            handleContentChange(markdown)
          }
        })
      })
      .use(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create()

    // Apply theme
    updateTheme()
  } catch (error) {
    console.error('Failed to initialize Milkdown editor:', error)
  }
})

// Update editor content when modelValue changes externally
watch(() => props.modelValue, (newValue) => {
  if (!editor || props.disabled) return

  // Only update if content actually changed (avoid infinite loops)
  if (newValue !== currentMarkdown.value) {
    try {
      // Destroy and recreate editor with new content
      editor.destroy()
      editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorContainer.value!)
          ctx.set(defaultValueCtx, newValue)
          
          ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              handleContentChange(markdown)
            }
          })
        })
        .use(nord)
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .create()
      
      currentMarkdown.value = newValue
      updateTheme()
    } catch (error) {
      console.error('Failed to update editor content:', error)
    }
  }
})

// Watch for theme changes
watch(() => themeStore.isDarkMode, () => {
  updateTheme()
})

// Update theme based on dark mode
const updateTheme = () => {
  if (!editorContainer.value) return
  
  // Apply theme class to container
  if (themeStore.isDarkMode) {
    editorContainer.value.classList.add('dark')
    editorContainer.value.classList.remove('light')
  } else {
    editorContainer.value.classList.add('light')
    editorContainer.value.classList.remove('dark')
  }
  
  // Trigger editor update if needed
  if (editor) {
    // Milkdown theme should adapt via CSS variables
    // The nord theme should respect the container classes
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  if (editor) {
    try {
      editor.destroy()
    } catch (error) {
      console.error('Error destroying Milkdown editor:', error)
    }
    editor = null
  }
})
</script>

<style scoped>
.milkdown-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: auto;
}

/* Milkdown editor styles */
.milkdown-editor-container :deep(.milkdown) {
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

.milkdown-editor-container.dark {
  background-color: var(--bg-primary);
}

.milkdown-editor-container.light {
  background-color: var(--bg-primary);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .milkdown-editor-container {
    min-height: 300px;
  }
  
  .milkdown-editor-container :deep(.milkdown) {
    padding: 0.75rem;
    font-size: 14px;
  }
}

/* Ensure editor is editable unless readonly */
.milkdown-editor-container :deep(.milkdown .editor) {
  outline: none;
}

/* Style common markdown elements */
.milkdown-editor-container :deep(.milkdown h1),
.milkdown-editor-container :deep(.milkdown h2),
.milkdown-editor-container :deep(.milkdown h3),
.milkdown-editor-container :deep(.milkdown h4),
.milkdown-editor-container :deep(.milkdown h5),
.milkdown-editor-container :deep(.milkdown h6) {
  color: var(--text-primary);
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.milkdown-editor-container :deep(.milkdown p) {
  margin: 0.75em 0;
  color: var(--text-primary);
}

.milkdown-editor-container :deep(.milkdown code) {
  background-color: var(--bg-secondary);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.milkdown-editor-container :deep(.milkdown pre) {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.milkdown-editor-container :deep(.milkdown pre code) {
  background-color: transparent;
  padding: 0;
}

.milkdown-editor-container :deep(.milkdown blockquote) {
  border-left: 4px solid var(--border-color);
  padding-left: 1rem;
  margin: 1em 0;
  color: var(--text-secondary);
}

.milkdown-editor-container :deep(.milkdown ul),
.milkdown-editor-container :deep(.milkdown ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.milkdown-editor-container :deep(.milkdown li) {
  margin: 0.25em 0;
}

.milkdown-editor-container :deep(.milkdown a) {
  color: #667eea;
  text-decoration: none;
}

.milkdown-editor-container :deep(.milkdown a:hover) {
  text-decoration: underline;
}

.milkdown-editor-container :deep(.milkdown table) {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.milkdown-editor-container :deep(.milkdown th),
.milkdown-editor-container :deep(.milkdown td) {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

.milkdown-editor-container :deep(.milkdown th) {
  background-color: var(--bg-secondary);
  font-weight: 600;
}
</style>

