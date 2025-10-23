<!-- ebc17d15-2f3c-4ed8-953e-6b6276d83a0a 603d30b4-5d85-4f3d-9514-e76a966731a1 -->
# Replace Preview with TipTap WYSIWYG Editor

## Overview

Replace the current preview mode with a TipTap WYSIWYG markdown editor that provides rich text editing capabilities while maintaining bidirectional sync with the Monaco code editor.

## Implementation Steps

### 1. Install TipTap Dependencies

Add the following packages to `frontend/package.json`:

- `@tiptap/vue-3` - Vue 3 integration
- `@tiptap/starter-kit` - Core extensions (bold, italic, headings, etc.)
- `@tiptap/extension-task-list` - Task list container
- `@tiptap/extension-task-item` - Individual checkbox items
- `@tiptap/extension-placeholder` - Placeholder text support
- `prosemirror-markdown` - Markdown serialization/parsing

### 2. Create TipTapEditor Component

Create `frontend/src/components/editor/TipTapEditor.vue`:

- Initialize TipTap editor with markdown support
- Configure extensions: StarterKit, TaskList, TaskItem, Placeholder
- **Custom Tab Extension**: Create keymap to handle Tab (indent) and Shift-Tab (outdent)
- **Checkbox Alignment CSS**: Ensure checkboxes and text are vertically aligned
- Implement same debounce auto-save as Monaco (1 second delay)
- Emit `update:modelValue` and `save` events matching Monaco's API
- Convert between markdown string (from Monaco) and TipTap's internal format
- Watch for external `modelValue` changes to keep editors in sync

### 3. Update NoteViewer Component

Modify `frontend/src/components/viewer/NoteViewer.vue`:

- Replace `'preview'` mode with `'wysiwyg'` mode
- Import and use `TipTapEditor` component instead of the preview display
- **Default logic**: Set `viewMode` to `'wysiwyg'` for `.md` files, `'editor'` otherwise
- Pass same `editableContent` ref to both Monaco and TipTap for bidirectional sync
- Keep the same `handleSave` function for both editors
- Update CSS for `.wysiwyg-view` class

### 4. Update ViewerToolbar Component  

Modify `frontend/src/components/viewer/ViewerToolbar.vue`:

- Change button text to icons only
- **Monaco/Code mode icon**: Use `<//>` or similar code symbol
- **TipTap/Markdown mode icon**: Use `Aa` or rich text symbol
- Add tooltips: "Code" for Monaco, "Markdown" for TipTap
- Update props/emits to use `'wysiwyg'` instead of `'preview'`
- Keep same styling but adjust for icon-only buttons

### 5. TipTap Specific Features

#### Checkbox Support & Alignment

```css
/* Ensure checkbox and text alignment */
ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
}

ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

ul[data-type="taskList"] li > div {
  flex: 1;
}
```

#### Tab Navigation Extension

```typescript
import { Extension } from '@tiptap/core'

const TabExtension = Extension.create({
  addKeyboardShortcuts() {
    return {
      'Tab': () => this.editor.commands.sinkListItem('listItem') || 
                   this.editor.commands.sinkListItem('taskItem'),
      'Shift-Tab': () => this.editor.commands.liftListItem('listItem') || 
                         this.editor.commands.liftListItem('taskItem'),
    }
  },
})
```

### 6. Update Documentation

Update `docs/architecture-design.md`:

- Document the dual-editor architecture (Monaco + TipTap)
- Explain bidirectional sync mechanism
- Document default editor selection logic
- Add TipTap extensions and features

Update `docs/api-endpoints.md` if needed (likely no changes required).

## Key Files to Modify

- `frontend/package.json` - Add TipTap dependencies
- `frontend/src/components/editor/TipTapEditor.vue` - **NEW FILE**
- `frontend/src/components/viewer/NoteViewer.vue` - Replace preview with TipTap
- `frontend/src/components/viewer/ViewerToolbar.vue` - Icon-based toggle
- `docs/architecture-design.md` - Document new editor system

## Testing Considerations

- Test bidirectional sync between Monaco and TipTap
- Verify checkbox rendering and interaction
- Test Tab/Shift-Tab in lists and task lists
- Verify auto-save debouncing works correctly
- Test default editor selection for .md vs other files
- Ensure icons and tooltips display correctly

### To-dos

- [ ] Install TipTap and related dependencies via npm
- [ ] Create TipTapEditor.vue with markdown support, checkboxes, tab handling, and auto-save
- [ ] Update NoteViewer.vue to use TipTap instead of preview and implement bidirectional sync
- [ ] Update ViewerToolbar.vue to use icons with tooltips instead of text labels
- [ ] Update architecture documentation to reflect dual-editor system