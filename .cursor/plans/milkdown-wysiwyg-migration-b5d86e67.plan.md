<!-- b5d86e67-bf7c-4224-886d-3be9a3c3a4bd 4d17ccf1-05c3-4978-a173-54ed6f413fe4 -->
# Milkdown WYSIWYG Editor Migration

## Current State Analysis

The app currently has:

- `MilkdownEditor.vue` - Split pane with source editor (left) and preview (right), with toggle controls
- `MonacoEditor.vue` - Code editor for non-markdown files
- `NoteViewer.vue` - Routes between 'editor' (Monaco) and 'wysiwyg' (Milkdown) modes based on file extension
- Default view for `.md` files: `wysiwyg` mode, which currently shows split panes

## Implementation Strategy

### 1. Transform MilkdownEditor Component

**File**: `frontend/src/components/editor/MilkdownEditor.vue`

**Changes**:

- Remove all pane control UI (buttons for 'both', 'source', 'preview')
- Remove the split container layout (source pane, resizer, preview pane)
- Remove the preview functionality (`marked` library usage, `previewRef`, `updatePreview()`)
- Remove resize handlers and state (`isResizing`, `startResize()`, etc.)
- Remove view mode state and related store persistence
- Keep only the Milkdown WYSIWYG editor
- Configure Milkdown editor to be truly WYSIWYG (currently it's just showing raw markdown)

**Key code sections to modify**:

- Lines 3-29: Remove pane control buttons
- Lines 31-62: Replace split container with single editor container
- Lines 110-111: Remove viewMode state
- Lines 142-153: Remove `updatePreview()` function
- Lines 155-159: Remove `setViewMode()` function
- Lines 161-187: Remove all resize functionality
- Lines 236-558: Remove all split-pane styling, keep only editor styles

**Milkdown Configuration**:
The current setup (lines 116-140) already uses Milkdown core with commonmark and GFM presets, which provides WYSIWYG editing. The issue is that it's not properly configured or styled for pure WYSIWYG. We need to:

- Ensure editor is properly initialized with WYSIWYG mode
- Add proper styling to make it look like a document editor
- Configure theme to match app light/dark mode

### 2. Update Vault Store

**File**: `frontend/src/stores/vault.ts`

**Changes**:

- Remove `milkdownViewMode` state property
- Remove `setMilkdownViewMode()` method
- Clean up any related localStorage persistence

### 3. Update ViewerToolbar Component

**File**: `frontend/src/components/viewer/ViewerToolbar.vue`

**Changes**:

- The toggle button (lines 14-22) currently switches between 'editor' (Monaco) and 'wysiwyg' (Milkdown)
- Keep this functionality as-is - it's for switching between Monaco and Milkdown, not for split panes
- The toggle text "Md" vs "</>" makes sense: Md = Milkdown WYSIWYG, </> = Monaco code editor

### 4. Update Tests

**Files to update**:

- `frontend/src/components/editor/MilkdownEditor.vue` tests (if they exist)
- Any integration tests referencing the split-pane UI

### 5. Package Dependencies

Current packages are already sufficient:

- `@milkdown/core`: ✅ Installed (v7.17.1)
- `@milkdown/preset-commonmark`: ✅ Installed
- `@milkdown/preset-gfm`: ✅ Installed
- `@milkdown/theme-nord`: ✅ Installed

No need to install `@milkdown/crepe` - the current setup can be configured for pure WYSIWYG.

## Implementation Todos

The implementation will proceed in this order to minimize breaking changes and ensure functionality throughout.

### To-dos

- [x] Refactor MilkdownEditor.vue to remove split-pane UI, preview functionality, and resize handlers - keep only WYSIWYG editor
- [x] Remove milkdownViewMode state and related methods from vault store
- [x] Update MilkdownEditor styles for single-pane WYSIWYG appearance
- [ ] Verify markdown files open correctly with WYSIWYG editor
- [ ] Verify non-markdown files still use Monaco editor