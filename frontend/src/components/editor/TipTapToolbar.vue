<template>
  <div v-if="editor" class="tiptap-toolbar">
    <div class="toolbar-group">
      <button
        @click="editor?.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor?.isActive('bold') }"
        class="toolbar-btn"
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="toolbar-btn"
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="toolbar-btn"
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <button
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        class="toolbar-btn"
        title="Inline Code"
      >
        <code>&lt;/&gt;</code>
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        class="toolbar-btn"
        title="Heading 1"
      >
        H1
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        class="toolbar-btn"
        title="Heading 2"
      >
        H2
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        class="toolbar-btn"
        title="Heading 3"
      >
        H3
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        class="toolbar-btn"
        title="Bullet List"
      >
        • List
      </button>
      <button
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        class="toolbar-btn"
        title="Numbered List"
      >
        1. List
      </button>
      <button
        @click="editor.chain().focus().toggleTaskList().run()"
        :class="{ 'is-active': editor.isActive('taskList') }"
        class="toolbar-btn"
        title="Task List"
      >
        ☑ List
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button
        @click="handleIndent"
        class="toolbar-btn"
        title="Indent (Tab)"
      >
        → Indent
      </button>
      <button
        @click="handleDeIndent"
        class="toolbar-btn"
        title="De-indent (Shift+Tab)"
      >
        ← Outdent
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        class="toolbar-btn"
        title="Blockquote"
      >
        " Quote
      </button>
      <button
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        class="toolbar-btn"
        title="Code Block"
      >
        { } Code
      </button>
      <button
        @click="editor.chain().focus().setHorizontalRule().run()"
        class="toolbar-btn"
        title="Horizontal Rule"
      >
        ─ HR
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().undo()"
        class="toolbar-btn"
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      <button
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().redo()"
        class="toolbar-btn"
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

interface Props {
  editor: Editor | null
}

const props = defineProps<Props>()

// Handle indent button click
const handleIndent = () => {
  if (!props.editor) return
  
  // Try list commands first - they return false if not applicable
  if (props.editor.commands.sinkListItem('listItem')) {
    return
  }
  if (props.editor.commands.sinkListItem('taskItem')) {
    return
  }
  
  // Fallback: insert spaces for regular text
  props.editor.commands.insertContent('    ')
}

// Handle de-indent button click
const handleDeIndent = () => {
  if (!props.editor) return
  
  // Try list commands first - they return false if not applicable
  if (props.editor.commands.liftListItem('listItem')) {
    return
  }
  if (props.editor.commands.liftListItem('taskItem')) {
    return
  }
  
  // For regular text, remove up to 4 spaces before cursor
  const { state } = props.editor
  const { selection } = state
  const { $anchor } = selection
  const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset)
  const match = textBefore.match(/[ ]{1,4}$/)
  
  if (match) {
    const from = $anchor.pos - match[0].length
    const to = $anchor.pos
    props.editor.commands.deleteRange({ from, to })
  }
}
</script>

<style scoped>
.tiptap-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 0.25rem;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background: #cbd5e1;
  margin: 0 0.25rem;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.toolbar-btn:active:not(:disabled) {
  background: #e2e8f0;
  transform: scale(0.98);
}

.toolbar-btn.is-active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn strong,
.toolbar-btn em,
.toolbar-btn s,
.toolbar-btn code {
  font-size: 0.875rem;
  font-style: normal;
  text-decoration: none;
}

.toolbar-btn em {
  font-style: italic;
}

.toolbar-btn s {
  text-decoration: line-through;
}

.toolbar-btn code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .tiptap-toolbar {
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .toolbar-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>

