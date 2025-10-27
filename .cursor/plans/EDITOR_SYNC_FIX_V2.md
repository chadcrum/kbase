# Editor Sync Fix V2 - Additional Improvements

## Problem Reported

User reported continued issues when toggling back and forth between editors, despite the initial fix.

## Root Causes Identified

After deeper investigation, I identified several additional issues:

### 1. **Programmatic Content Updates Triggering Events**
**Issue:** When we programmatically set content in an editor (via `setContent()` or `setValue()`), it would trigger the `onUpdate` or `onDidChangeModelContent` callbacks, causing spurious emit events.

**Impact:** This created feedback loops where setting content would emit an update, which would trigger watchers, which would set content again, etc.

### 2. **Markdown Normalization Issues**
**Issue:** TipTap's markdown serialization wasn't perfectly round-trip safe. Small formatting differences (extra newlines, whitespace) would cause the content comparison to fail, triggering unnecessary updates.

**Example:**
```markdown
# Heading

Content
```
vs
```markdown
# Heading


Content
```

These are functionally identical but would be seen as different, causing update loops.

### 3. **Insufficient Async Delay**
**Issue:** The `setTimeout(..., 0)` delay wasn't sufficient for the event loop to properly sequence async operations, especially with TipTap's async markdown conversion.

**Impact:** Race conditions where watchers would fire before flags were properly reset.

### 4. **Component Lifecycle Issues**
**Issue:** Using `v-if` to switch between editors causes the old editor to unmount and new one to mount. Without proper keys, Vue might reuse component instances incorrectly.

**Impact:** Stale state could persist between switches.

## Solutions Implemented

### 1. Added `isSettingContent` Flag

**Both Editors (MonacoEditor.vue & TipTapEditor.vue):**

```typescript
let isSettingContent = false

// In onUpdate/onDidChangeModelContent:
onUpdate: ({ editor }) => {
  // Don't emit if we're programmatically setting content
  if (isSettingContent) {
    return
  }
  // ... rest of update logic
}

// When setting content programmatically:
isSettingContent = true
try {
  editor.value.commands.setContent(html) // or editor.setValue(value)
} finally {
  setTimeout(() => {
    isSettingContent = false
  }, 10)
}
```

**Benefit:** Completely eliminates spurious update events during programmatic updates.

### 2. Added Markdown Normalization

**TipTap Editor Only:**

```typescript
const normalizeMarkdown = (markdown: string): string => {
  return markdown
    .trim() // Remove leading/trailing whitespace
    .replace(/\r\n/g, '\n') // Normalize line endings (Windows -> Unix)
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
}

// Used in comparisons:
const normalizedMarkdown = normalizeMarkdown(markdown)
const normalizedLast = normalizeMarkdown(lastEmittedContent)

if (normalizedMarkdown === normalizedLast) {
  return // Skip update
}
```

**Benefit:** Handles markdown formatting variations that are semantically identical.

### 3. Increased Async Delay

**Changed from:**
```typescript
setTimeout(() => {
  isUpdatingFromEditor = false
}, 0)
```

**To:**
```typescript
setTimeout(() => {
  isUpdatingFromEditor = false
}, 10) // 10ms delay
```

**Benefit:** Gives async operations (especially TipTap's markdown conversion) time to complete before resetting flags.

### 4. Added Component Keys

**NoteViewer.vue:**

```vue
<MonacoEditor
  :key="`monaco-${selectedNote.path}`"
  v-model="editableContent"
  :path="selectedNote.path"
  @save="handleSave"
/>

<TipTapEditor
  :key="`tiptap-${selectedNote.path}`"
  v-model="editableContent"
  :path="selectedNote.path"
  @save="handleSave"
/>
```

**Benefit:** Forces complete reinitialization when switching editors, ensuring clean state.

## Complete Flow After Fixes

### User Types in TipTap → Switches to Monaco

1. User types in TipTap
2. `onUpdate` fires → checks `isSettingContent` (false) → proceeds
3. Serializes to markdown → normalizes → compares with `lastEmittedContent`
4. If different, emits `update:modelValue` → updates `editableContent` in parent
5. Sets `isUpdatingFromEditor = true` for 10ms
6. User clicks toggle button
7. TipTap unmounts (key changed)
8. Monaco mounts with `editableContent` prop
9. Monaco's watcher sees new value → checks flags
10. Sets `isSettingContent = true` → calls `setValue()` → resets flag after 10ms
11. `onDidChangeModelContent` fires but checks `isSettingContent` → skips emit
12. Content successfully displayed in Monaco

### User Types in Monaco → Switches to TipTap

1. User types in Monaco
2. `onDidChangeModelContent` fires → checks `isSettingContent` (false) → proceeds
3. Gets value → compares with `lastEmittedContent`
4. If different, emits `update:modelValue` → updates `editableContent` in parent
5. Sets `isUpdatingFromEditor = true` for 10ms
6. User clicks toggle button
7. Monaco unmounts (key changed)
8. TipTap mounts with `editableContent` prop
9. TipTap's watcher sees new value → checks flags
10. Normalizes both old and new content → compares
11. Sets `isSettingContent = true` → converts markdown to HTML → calls `setContent()` → resets flag
12. `onUpdate` fires but checks `isSettingContent` → skips emit
13. Content successfully rendered in TipTap

## Testing Recommendations

### Manual Testing Scenarios

1. **Type → Save → Switch**
   - Type in TipTap
   - Wait for "Saved" indicator
   - Switch to Monaco
   - ✅ Content should be preserved

2. **Type → Immediate Switch**
   - Type in TipTap
   - Immediately click toggle (don't wait for save)
   - ✅ Content should still be there

3. **Rapid Switching**
   - Type in TipTap
   - Switch to Monaco
   - Switch back to TipTap
   - Switch to Monaco
   - Repeat 5x quickly
   - ✅ Content should remain correct, no duplication

4. **Special Content**
   - Test with task lists: `- [ ] Task` and `- [x] Done`
   - Test with multiple blank lines
   - Test with special characters: `<>&"'`
   - Test with code blocks
   - ✅ All should preserve correctly

5. **Different Files**
   - Edit file A in TipTap
   - Switch to file B
   - Switch back to file A
   - Switch to Monaco
   - ✅ Content should be correct for each file

### What to Look For

**Good Signs:**
- ✅ Content always matches between editors
- ✅ No duplicate text appearing
- ✅ No text disappearing
- ✅ Save indicator works correctly
- ✅ No console errors/warnings
- ✅ Smooth switching animation

**Bad Signs:**
- ❌ Content changes after switching
- ❌ Text duplicates or disappears
- ❌ Console errors about watchers or updates
- ❌ Delay or flash when switching
- ❌ Save indicator stuck on "Saving..."

## Debugging

If issues still occur, check browser console for:

1. **Infinite Loop Warnings**
   - Look for "Maximum recursive updates exceeded"
   - This means flags aren't working properly

2. **Content Mismatch**
   - Add console.log in watchers to see what content is being set
   - Check if markdown normalization is handling your content correctly

3. **Timing Issues**
   - If still seeing issues, may need to increase delay from 10ms to 20ms
   - Or add more sophisticated async handling

## Files Modified

- ✅ `frontend/src/components/editor/MonacoEditor.vue`
- ✅ `frontend/src/components/editor/TipTapEditor.vue`
- ✅ `frontend/src/components/viewer/NoteViewer.vue`
- ✅ `docs/architecture-design.md`

## Commits

```
27afe54 docs: update bidirectional sync documentation with additional improvements
7f469b3 fix(editors): further improve bidirectional sync robustness
```

## Summary

This second round of fixes addresses deeper issues with:
1. Event handling during programmatic updates
2. Markdown round-trip stability
3. Async timing and race conditions
4. Component lifecycle management

The combination of these fixes should make editor switching completely reliable and seamless.

## Next Steps If Issues Persist

If you're still experiencing issues, please provide:

1. **Specific scenario** where it fails
2. **Content** that causes the issue
3. **Browser console logs** (especially errors/warnings)
4. **Steps to reproduce** the exact issue

This will help identify any edge cases not covered by current fixes.

