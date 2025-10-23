# Editor Sync Simplification with v-show

## Overview

This document describes the major architectural improvement to the bidirectional sync between Monaco Editor and TipTap Editor. The previous `v-if` approach with complex flag management has been replaced with a simpler, more reliable `v-show` approach.

## Problem with Previous Approach

The original implementation used `v-if` to conditionally render editors, which caused:

1. **Lifecycle Complexity**: Editors would unmount and remount when switching, triggering complex initialization sequences
2. **Timing Issues**: Required multiple flags (`isUpdatingFromEditor`, `isSettingContent`, `lastEmittedContent`) to prevent race conditions
3. **Async Delays**: Needed setTimeout delays (10ms) to handle flag resets
4. **Markdown Normalization**: Required normalization logic to handle formatting differences
5. **Data Loss Bug**: List items in TipTap lost their text content when switching to Monaco due to incorrect serialization

## New Simplified Approach

### Key Changes

1. **v-show Instead of v-if**: Both editors remain mounted at all times, only visibility changes
2. **Disabled Prop**: Hidden editor is disabled to prevent conflicting updates
3. **Removed All Complex Flags**: No more `isUpdatingFromEditor`, `isSettingContent`, or `lastEmittedContent`
4. **Fixed Serialization Bug**: List items now correctly extract text from paragraph nodes
5. **Simple Content Comparison**: Just `newValue !== currentValue` - no normalization needed

### Benefits

✅ **~100 lines of complexity removed** - Cleaner, more maintainable code

✅ **No timing issues** - No mount/unmount lifecycle to manage

✅ **No race conditions** - No async flag management needed

✅ **Reliable sync** - v-model "just works" without special handling

✅ **Fixed data loss** - Text in lists no longer disappears

✅ **Faster switching** - No remounting delay

## Implementation Details

### 1. TipTapEditor.vue Changes

**Removed:**
- `isUpdatingFromEditor` flag
- `isSettingContent` flag
- `lastEmittedContent` tracking
- `normalizeMarkdown()` function
- All setTimeout delays
- Complex comparison logic

**Added:**
- `disabled?: boolean` prop (default: false)
- Check for `props.disabled` in `onUpdate` callback
- Check for `props.disabled` in watchers

**Fixed:**
- Markdown serialization for `bulletList`, `orderedList`, and `taskList`
- Now correctly extracts text from paragraph nodes inside list items

```typescript
// Before (broken):
listItem.forEach((content) => {
  markdown += serialize(content).trim()  // Doesn't extract text!
})

// After (fixed):
listItem.forEach((content) => {
  if (content.type.name === 'paragraph') {
    content.forEach((inline) => {
      if (inline.isText) {
        markdown += inline.text  // Correctly extracts text
      }
    })
  } else {
    markdown += serialize(content).trim()
  }
})
```

### 2. MonacoEditor.vue Changes

**Removed:**
- `isUpdatingFromEditor` flag
- `isSettingContent` flag
- `lastEmittedContent` tracking
- All setTimeout delays
- Complex comparison logic

**Added:**
- `disabled?: boolean` prop (default: false)
- Check for `props.disabled` in `onDidChangeModelContent` callback
- Check for `props.disabled` in watchers

**Simplified:**
- Content change listener: Just emit on any change (if not disabled)
- External content watcher: Just setValue if content differs (if not disabled)

### 3. NoteViewer.vue Changes

**Changed from v-if to v-show:**

```vue
<!-- Before: -->
<div v-if="viewMode === 'editor'" class="editor-view">
  <MonacoEditor :key="`monaco-${selectedNote.path}`" ... />
</div>
<div v-else class="wysiwyg-view">
  <TipTapEditor :key="`tiptap-${selectedNote.path}`" ... />
</div>

<!-- After: -->
<div v-show="viewMode === 'editor'" class="editor-view">
  <MonacoEditor :disabled="viewMode !== 'editor'" ... />
</div>
<div v-show="viewMode === 'wysiwyg'" class="wysiwyg-view">
  <TipTapEditor :disabled="viewMode !== 'wysiwyg'" ... />
</div>
```

**Added CSS:**
```css
/* Hide inactive editors properly to prevent layout issues */
.editor-view[style*="display: none"],
.wysiwyg-view[style*="display: none"] {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
}
```

### 4. Documentation Updates

Updated `docs/architecture-design.md` to reflect:
- Simplified bidirectional sync architecture
- v-show approach instead of v-if
- Disabled prop mechanism
- Fixed markdown serialization
- Removed references to complex flag management

## How It Works

1. **Both Editors Always Mounted**: Both Monaco and TipTap are mounted when a note is loaded
2. **Visibility Toggle**: `v-show` controls which editor is visible
3. **Disabled State**: Hidden editor has `disabled={true}` prop
4. **Active Editor Updates**:
   - User types in active editor
   - Editor's `onUpdate` or `onDidChangeModelContent` fires
   - Checks `if (props.disabled) return` → passes (not disabled)
   - Emits `update:modelValue` to parent
   - Parent updates `editableContent` ref
5. **Hidden Editor Receives Update**:
   - Watcher sees `editableContent` changed
   - Checks `if (props.disabled) return` → exits early
   - Editor content is NOT updated (it's disabled)
6. **Switching Editors**:
   - User clicks toggle button
   - `viewMode` changes from 'editor' to 'wysiwyg' (or vice versa)
   - `v-show` toggles visibility instantly
   - `disabled` prop toggles (old editor becomes disabled, new editor becomes active)
   - New active editor's watcher runs:
     - Checks `if (props.disabled) return` → passes (now active)
     - Compares content: `if (newValue !== currentValue)`
     - Updates editor content if different
   - User sees updated content immediately

## Testing

After implementation, test these scenarios:

- ✅ Create bullet list in TipTap → switch to Monaco → verify text present
- ✅ Create checkbox list in TipTap → switch to Monaco → verify text present
- ✅ Type in Monaco → switch to TipTap → verify renders correctly
- ✅ Rapid switching 10x → verify no issues
- ✅ Multiple files → verify switching works
- ✅ Auto-save → verify works in both editors

## Migration Notes

If you had any custom code that relied on the old flag system:

1. Remove any references to `isUpdatingFromEditor`, `isSettingContent`, or `lastEmittedContent`
2. Remove any setTimeout delays for flag resets
3. Remove any markdown normalization logic
4. Simply check `props.disabled` before processing updates
5. Trust the v-model binding - it works reliably now!

## Conclusion

This architectural change significantly simplifies the editor sync logic while making it more reliable. The v-show approach eliminates an entire class of lifecycle-related bugs and makes the code much easier to understand and maintain.

