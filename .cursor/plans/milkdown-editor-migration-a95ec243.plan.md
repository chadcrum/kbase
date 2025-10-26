<!-- a95ec243-9abb-4ba5-8062-72d88559dc33 1eaac78a-bd1e-4276-92b8-b05c8554cd0a -->
# Milkdown Editor Migration Plan

## Overview

Replace TipTap with Milkdown split-pane editor (markdown source | rendered preview) for `.md` files while keeping Monaco for non-markdown files. Implement horizontal split layout with collapsible panes and persistent user preferences.

## Phase 1: Foundation & Basic Implementation (5-8 hours)

### 1.1 Install Dependencies

- Install core Milkdown packages: `@milkdown/core`, `@milkdown/ctx`, `@milkdown/prose`, `@milkdown/vue`
- Install essential plugins: `@milkdown/preset-commonmark`, `@milkdown/preset-gfm`, `@milkdown/plugin-listener`
- Install theme: `@milkdown/theme-nord` (or similar modern theme)
- Update `package.json` and run install

### 1.2 Create MilkdownEditor Component

- Create new file: `frontend/src/components/editor/MilkdownEditor.vue`
- Implement basic Milkdown editor initialization with Vue 3 Composition API
- Configure split-pane layout (horizontal: markdown source left, preview right)
- Match existing editor API: Accept `modelValue`, `path`, `readonly`, `disabled` props
- Emit `update:modelValue` and `save` events (same as TipTap/Monaco)
- Implement 1-second debounced auto-save (matching existing behavior)

### 1.3 Pane Visibility State Management

- Add pane visibility state to `vault` store in `frontend/src/stores/vault.ts`:
- `milkdownViewMode`: `'both' | 'source' | 'preview'`
- Load from localStorage with key `kbase_milkdown_view_mode`
- Actions: `setMilkdownViewMode(mode)`
- Default to `'both'` (show both panes) on first visit
- Persist preference changes to localStorage

### 1.4 Replace TipTap in NoteViewer

- Update `frontend/src/components/viewer/NoteViewer.vue`:
- Replace `TipTapEditor` import with `MilkdownEditor`
- Keep `MonacoEditor` for non-markdown files
- Update template to use `MilkdownEditor` for `viewMode === 'wysiwyg'`
- No changes to save handling or view mode toggle logic

## Phase 2: Feature Parity (3-4 hours)

### 2.1 Task List & Checkbox Support

- Install `@milkdown/plugin-gfm` (includes task list support)
- Configure task list plugin in Milkdown editor
- Verify checkbox rendering and interaction in preview pane
- Verify markdown serialization for checkboxes: `- [ ]` and `- [x]`

### 2.2 Keyboard Shortcuts

- Implement Tab/Shift-Tab for list indentation (if not built-in)
- Add Ctrl+S / Cmd+S for manual save trigger (optional enhancement)
- Verify standard markdown shortcuts work (Ctrl+B for bold, etc.)

### 2.3 Theme Integration

- Integrate with existing dark mode system from `themeStore`
- Apply appropriate Milkdown theme based on `isDarkMode`
- Ensure both source and preview panes respect theme
- Update CSS to match app's existing color scheme using CSS variables

### 2.4 Pane Control UI

- Add pane visibility toggle buttons to `ViewerToolbar.vue` or create inline controls
- Three-state toggle: Both | Source Only | Preview Only
- Update icons/buttons to indicate current view mode
- Smooth CSS transitions for pane collapse/expand (0.3s ease)

## Phase 3: Cleanup & Polish (2-3 hours)

### 3.1 Remove TipTap Dependencies

- Delete files: `frontend/src/components/editor/TipTapEditor.vue`
- Delete files: `frontend/src/components/editor/TipTapToolbar.vue`
- Remove from `package.json`: `@tiptap/*` packages (8 packages total)
- Remove unused imports: `marked` library (if only used by TipTap)
- Run `npm install` to clean up `node_modules`

### 3.2 Update Tests

- Update `frontend/src/components/viewer/NoteViewer.test.ts`:
- Mock Milkdown instead of TipTap
- Verify basic editor rendering
- Test auto-save integration
- Update E2E tests in `frontend/e2e/specs/`:
- `editor-sync.spec.ts`: Update for Milkdown pane behavior
- `ui-enhancements.spec.ts`: Update editor-related assertions
- Ensure all tests pass

### 3.3 Documentation Updates

- Update `docs/architecture-design.md`:
- Replace TipTap references with Milkdown
- Document split-pane architecture
- Update component structure section
- Add pane visibility preference documentation
- Update `docs/initial-mvp-design.md` if applicable
- Update `backend/README.md` and `frontend/README.md` if they mention TipTap

### 3.4 Final Verification

- Test all markdown features: headings, lists, checkboxes, code blocks, links, images
- Test pane collapse/expand functionality
- Test preference persistence (refresh page, verify last view mode restored)
- Test dark mode theme switching in both panes
- Test auto-save with visual feedback
- Test switching between markdown and non-markdown files
- Verify Monaco still works for non-markdown files

## Key Files Modified

- `frontend/src/components/editor/MilkdownEditor.vue` (NEW)
- `frontend/src/components/viewer/NoteViewer.vue` (MODIFY)
- `frontend/src/components/viewer/ViewerToolbar.vue` (MODIFY - add pane controls)
- `frontend/src/stores/vault.ts` (MODIFY - add pane state)
- `frontend/package.json` (MODIFY - dependencies)
- `docs/architecture-design.md` (UPDATE)
- Test files (UPDATE)

## Key Files Deleted

- `frontend/src/components/editor/TipTapEditor.vue` (693 lines)
- `frontend/src/components/editor/TipTapToolbar.vue` (315 lines)

## Expected Benefits

- **Simpler**: ~1000 lines of complex TipTap code removed
- **No Sync Issues**: Single editor instance, no dual-editor sync complexity
- **Better UX**: Users see markdown source + preview simultaneously
- **Markdown-Native**: No custom serialization logic needed
- **Flexible**: Users can collapse either pane for focused editing
- **Modern**: Beautiful, professional editor matching Milkdown playground

## Estimated Timeline

- **Phase 1**: 5-8 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 2-3 hours
- **Total**: 10-15 hours

## Success Criteria

- ✅ Milkdown editor renders markdown with split-pane view
- ✅ Auto-save works with 1-second debounce
- ✅ Task lists and checkboxes work correctly
- ✅ Pane visibility preferences persist across sessions
- ✅ Dark mode theme applies correctly
- ✅ Monaco editor still works for non-markdown files
- ✅ All tests pass
- ✅ Documentation updated
- ✅ TipTap code fully removed

### To-dos

- [ ] Install Milkdown packages and dependencies
- [ ] Create MilkdownEditor.vue with split-pane layout
- [ ] Add pane visibility state to vault store with localStorage persistence
- [ ] Replace TipTap with Milkdown in NoteViewer.vue
- [ ] Implement task list and checkbox support
- [ ] Add keyboard shortcuts (Tab/Shift-Tab for indentation)
- [ ] Integrate with dark mode theme system
- [ ] Add pane visibility toggle controls to UI
- [ ] Delete TipTap files and remove dependencies from package.json
- [ ] Update unit and E2E tests for Milkdown
- [ ] Update architecture documentation to reflect Milkdown
- [ ] Test all features and verify complete functionality