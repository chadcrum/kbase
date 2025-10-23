<!-- d78d0da7-678e-45ea-b1ec-6c808878df30 a60f8108-06fd-471b-9593-63e40a3f467e -->
# Simplify Editor Sync with v-show Approach

## Problem

Current v-if approach causes editors to unmount/remount, creating complex timing issues that require extensive flag management. Additionally, the markdown serializer has a bug that loses text in lists.

## Solution

Use v-show to keep both editors mounted but hidden, eliminating lifecycle complexity.

## Implementation Steps

### 1. Fix Markdown Serialization Bug in TipTapEditor.vue

**File:** `frontend/src/components/editor/TipTapEditor.vue`

**Current broken code (lines ~168-182):**

```typescript
} else if (child.type.name === 'bulletList') {
  child.forEach((listItem) => {
    markdown += '- '
    listItem.forEach((content) => {
      markdown += serialize(content).trim()  // ← Doesn't extract text!
    })
    markdown += '\n'
  })
}
```

**Fix:** Extract actual text content from list items:

```typescript
} else if (child.type.name === 'bulletList') {
  child.forEach((listItem) => {
    markdown += '- '
    // Extract text from paragraph inside list item
    listItem.forEach((content) => {
      if (content.type.name === 'paragraph') {
        content.forEach((inline) => {
          if (inline.isText) {
            markdown += inline.text
          }
        })
      }
    })
    markdown += '\n'
  })
}
```

Apply same fix to orderedList and taskList.

### 2. Remove Complex Flag Logic from Both Editors

**Remove from both MonacoEditor.vue and TipTapEditor.vue:**

- `isUpdatingFromEditor` flag and related logic
- `isSettingContent` flag and related logic
- `lastEmittedContent` tracking
- `normalizeMarkdown()` function (TipTap only)
- All setTimeout delays
- Complex comparison logic

**Keep only:**

- Simple v-model emit on content change
- Auto-save debouncing

### 3. Add Disabled Prop to Both Editors

**MonacoEditor.vue:**

```typescript
interface Props {
  modelValue: string
  path: string
  readonly?: boolean
  disabled?: boolean  // ← NEW
}

// In watcher:
watch(() => props.modelValue, (newValue) => {
  if (!editor || props.disabled) return  // Skip if disabled
  
  const currentValue = editor.getValue()
  if (newValue !== currentValue) {
    editor.setValue(newValue)
  }
})

// In onDidChangeModelContent:
editor.onDidChangeModelContent(() => {
  if (!editor || props.disabled) return  // Skip if disabled
  
  const value = editor.getValue()
  emit('update:modelValue', value)
  // ... auto-save logic
})
```

**TipTapEditor.vue:** Same pattern with disabled prop

### 4. Update NoteViewer to Use v-show

**File:** `frontend/src/components/viewer/NoteViewer.vue`

**Change from v-if to v-show:**

```vue
<!-- Monaco Editor View -->
<div v-show="viewMode === 'editor'" class="editor-view">
  <MonacoEditor
    v-model="editableContent"
    :path="selectedNote.path"
    :disabled="viewMode !== 'editor'"
    @save="handleSave"
  />
</div>

<!-- TipTap WYSIWYG View -->
<div v-show="viewMode === 'wysiwyg'" class="wysiwyg-view">
  <TipTapEditor
    v-model="editableContent"
    :path="selectedNote.path"
    :disabled="viewMode !== 'wysiwyg'"
    @save="handleSave"
  />
</div>
```

**Remove:** Component keys (no longer needed)

### 5. Simplify Editor Watchers

**MonacoEditor.vue simplified watcher:**

```typescript
watch(() => props.modelValue, (newValue) => {
  if (!editor || props.disabled) return
  
  const currentValue = editor.getValue()
  if (newValue !== currentValue) {
    editor.setValue(newValue)
  }
})
```

**TipTapEditor.vue simplified watcher:**

```typescript
watch(() => props.modelValue, async (newValue) => {
  if (!editor.value || props.disabled) return

  const currentMarkdown = editorToMarkdown(editor.value.state.doc)
  if (newValue !== currentMarkdown) {
    const html = await markdownToHtml(newValue)
    editor.value.commands.setContent(html)
  }
})
```

### 6. Update CSS for v-show

Ensure hidden editors don't cause layout issues:

```css
.editor-view[style*="display: none"],
.wysiwyg-view[style*="display: none"] {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
}
```

## Benefits

✅ **Simpler code:** ~100 lines of complexity removed

✅ **No timing issues:** No mount/unmount lifecycle

✅ **No race conditions:** No async flag management needed

✅ **Reliable sync:** v-model "just works"

✅ **Fixed bug:** Text no longer disappears in lists

✅ **Faster switching:** No remounting delay

## Testing Checklist

- [ ] Create bullet list in TipTap → switch to Monaco → verify text present
- [ ] Create checkbox list in TipTap → switch to Monaco → verify text present
- [ ] Type in Monaco → switch to TipTap → verify renders correctly
- [ ] Rapid switching 10x → verify no issues
- [ ] Multiple files → verify switching works
- [ ] Auto-save → verify works in both editors

## Files Modified

1. `frontend/src/components/editor/TipTapEditor.vue` - Fix serialization, remove complexity, add disabled prop
2. `frontend/src/components/editor/MonacoEditor.vue` - Remove complexity, add disabled prop  
3. `frontend/src/components/viewer/NoteViewer.vue` - Change v-if to v-show
4. `docs/architecture-design.md` - Update documentation

## Documentation Updates

Update bidirectional sync section to reflect simplified approach:

- No complex flags
- Uses v-show instead of v-if
- Disabled prop prevents updates when hidden
- Fixed markdown serialization

### To-dos

- [ ] Add recursive item counts to directory nodes in file explorer with lighter color styling
- [ ] Fix vertical alignment of text next to checkboxes in TipTap editor task lists
- [ ] Add collapse/expand button for sidebar in primary pane toolbar
- [ ] Sort omni search results by last modified date (backend + frontend)