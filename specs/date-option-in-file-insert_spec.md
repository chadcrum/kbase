# KBase Date Functionality Specification

## Overview
Add two new date-related features to KBase:
1. Insert current date as text (yyyy-mm-dd format) into the active note
2. Rename file with current date (yyyy-mm-dd.md format)

These features will be accessible via context menus on:
- Right-click within the note editor
- Right-click on note tabs
- Right-click on files in the file explorer

## Date Format
- **Text insertion format**: `yyyy-mm-dd` (e.g., `2025-11-28`)
- **File rename format**: `yyyy-mm-dd.md` (e.g., `2025-11-28.md`)
- Use local timezone for date generation

---

## Feature 1: Insert Date as Text

### User Flow
1. User right-clicks in one of three locations:
   - Inside the note editor (Monaco or Milkdown)
   - On a note tab
   - On a note file in the file explorer
2. Context menu appears with option: **"Insert Date"**
3. User clicks "Insert Date"
4. Current date in `yyyy-mm-dd` format is inserted:
   - **If editor context**: Insert at cursor position
   - **If tab/file explorer context**: Insert at end of note content

### Implementation Details

#### Frontend Changes

**File: `frontend/src/components/NoteEditor.vue` (or similar editor component)**

1. Add context menu handler for editor right-clicks
2. Add new menu item: "Insert Date"
3. On click, get current date and insert at cursor position
4. For Monaco editor: Use `editor.executeEdits()` to insert text at cursor
5. For Milkdown editor: Use Milkdown's insert command API

**File: `frontend/src/components/NoteTabs.vue` (or tab component)**

1. Add "Insert Date" to existing tab context menu
2. On click, append date to end of current note content
3. Trigger save after insertion

**File: `frontend/src/components/FileTree.vue` (or file explorer component)**

1. Add "Insert Date" to existing file context menu (only for `.md` files)
2. On click:
   - Load file content if not already loaded
   - Append date to end of content
   - Save the file

#### Date Generation Function

Create a utility function in `frontend/src/utils/dateUtils.ts`:

```typescript
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

#### Context Menu Structure

Update all three context menu locations to include:
```typescript
{
  label: 'Insert Date',
  icon: 'calendar', // or appropriate icon from lucide-vue
  action: () => insertDateIntoNote()
}
```

---

## Feature 2: Rename File with Date

### User Flow
1. User right-clicks in one of three locations:
   - On a note tab
   - On a note file in the file explorer
   - Inside the note editor (less common, but supported)
2. Context menu appears with option: **"Rename File with Date"**
3. User clicks "Rename File with Date"
4. File is renamed to `yyyy-mm-dd.md`
5. System handles conflicts and UI updates

### Implementation Details

#### Frontend Changes

**File: `frontend/src/components/NoteTabs.vue`**

1. Add "Rename File with Date" to tab context menu
2. On click, call rename API with new date-based filename
3. Update active tab reference after successful rename

**File: `frontend/src/components/FileTree.vue`**

1. Add "Rename File with Date" to file context menu
2. On click, call rename API with new date-based filename
3. Refresh file tree to show updated filename

**File: `frontend/src/components/NoteEditor.vue`**

1. Add "Rename File with Date" to editor context menu (optional)
2. Implementation same as tab context menu

#### Rename Logic

Create a utility function in `frontend/src/utils/fileUtils.ts`:

```typescript
export function generateDateFilename(currentPath: string): string {
  const dateStr = getCurrentDateString(); // from dateUtils
  const dir = getDirectoryPath(currentPath);
  return `${dir}/${dateStr}.md`;
}
```

#### API Integration

Use existing rename endpoint: `PUT /api/v1/notes/{path}`

**Request payload:**
```json
{
  "new_path": "path/to/yyyy-mm-dd.md"
}
```

---

## Edge Cases & Error Handling

### 1. File Already Exists with Date Name

**Scenario**: A file named `2025-11-28.md` already exists when trying to rename.

**Solution**:
- Check if target filename exists before renaming
- If exists, append a counter: `2025-11-28-1.md`, `2025-11-28-2.md`, etc.
- Display toast notification: "File renamed to 2025-11-28-1.md (original date file exists)"

**Implementation**:
```typescript
async function getUniqueFilename(basePath: string, dateStr: string): Promise<string> {
  let filename = `${dateStr}.md`;
  let counter = 1;
  
  while (await fileExists(`${basePath}/${filename}`)) {
    filename = `${dateStr}-${counter}.md`;
    counter++;
  }
  
  return filename;
}
```

### 2. Multiple Tabs Open for Same File

**Scenario**: User has same file open in multiple tabs and renames via one tab.

**Solution**:
- After successful rename, update ALL tabs showing that file
- Use Pinia store to track file path changes
- Subscribe to file rename events in all tab components
- Update tab labels and internal file references

**Implementation**:
```typescript
// In Pinia store
fileRenamed(oldPath: string, newPath: string) {
  // Update all open tabs with this file
  this.tabs.forEach(tab => {
    if (tab.path === oldPath) {
      tab.path = newPath;
      tab.title = extractFilename(newPath);
    }
  });
}
```

### 3. Unsaved Changes When Renaming

**Scenario**: User has unsaved changes and renames the file.

**Solution**:
- Auto-save before renaming
- Show confirmation dialog: "Save changes before renaming?"
- Options: "Save & Rename", "Discard & Rename", "Cancel"

**Implementation**:
```typescript
async function handleRenameWithDate() {
  if (hasUnsavedChanges()) {
    const result = await showConfirmDialog({
      title: 'Unsaved Changes',
      message: 'Save changes before renaming?',
      buttons: ['Save & Rename', 'Discard & Rename', 'Cancel']
    });
    
    if (result === 'Cancel') return;
    if (result === 'Save & Rename') await saveNote();
  }
  
  await renameFileWithDate();
}
```

### 4. File Currently Being Edited

**Scenario**: File is actively being edited when rename occurs.

**Solution**:
- Lock editor during rename operation
- Show loading indicator
- After rename completes, unlock editor
- Update editor's internal file path reference

### 5. Git Commit During Rename

**Scenario**: Auto-commit happens during file rename operation.

**Solution**:
- Backend already handles git commits every 5 minutes
- Rename operation is atomic at the API level
- Git will see the rename as delete + add (normal behavior)
- No special handling needed, but ensure rename completes before next commit cycle

### 6. File in Subdirectory

**Scenario**: Renaming file that's in a subdirectory (e.g., `notes/journal/my-note.md`)

**Solution**:
- Preserve directory path: `notes/journal/2025-11-28.md`
- Do not move file to root
- Extract directory path before generating new filename

**Implementation**:
```typescript
function getDirectoryPath(fullPath: string): string {
  const parts = fullPath.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}
```

### 7. Binary File Protection

**Scenario**: User attempts date operations on binary files.

**Solution**:
- Only show "Insert Date" for `.md` files (text files)
- Only show "Rename File with Date" for any file type (rename works for all)
- Backend already has binary file detection (null byte check)

### 8. No Active File

**Scenario**: User right-clicks in editor context menu but no file is open.

**Solution**:
- Disable or hide date menu items when no file is active
- Check `currentFile !== null` before showing options

### 9. Read-Only Files

**Scenario**: File permissions prevent renaming.

**Solution**:
- Backend will return error if rename fails
- Show error toast: "Unable to rename file: Permission denied"
- Log error for debugging

### 10. Network Failure During Rename

**Scenario**: API call fails due to network issues.

**Solution**:
- Show error toast: "Rename failed. Please try again."
- Do not update UI state
- Allow user to retry operation
- Connection status banner will alert user to backend issues

---

## UI/UX Considerations

### Context Menu Positioning

**Editor Context Menu**:
- Position at mouse cursor location
- Include date options between existing "Copy" and "Paste" options

**Tab Context Menu**:
- Position below the tab being right-clicked
- Add date options after "Close" and before "Close Others"

**File Explorer Context Menu**:
- Position at mouse cursor location
- Add date options after "Rename" and before "Delete"

### Visual Feedback

**On Insert Date**:
- Brief highlight animation on inserted text (1 second fade)
- No toast notification (too intrusive for simple insert)

**On Rename**:
- Toast notification: "File renamed to 2025-11-28.md"
- Update file tree immediately
- Update tab label immediately
- Smooth transition, no jarring UI jumps

### Keyboard Shortcuts (Optional Enhancement)

Consider adding:
- `Ctrl+Alt+D` or `Cmd+Alt+D`: Insert date
- `Ctrl+Shift+D` or `Cmd+Shift+D`: Rename file with date

---

## Backend Changes (Minimal)

### No New Endpoints Required

The existing API endpoints handle all necessary operations:
- `PUT /api/v1/notes/{path}` - For renaming files
- `PUT /api/v1/notes/{path}` - For updating note content (insert date)

### Backend Validation

Ensure existing validation handles:
- Date-formatted filenames (`yyyy-mm-dd.md`)
- No path traversal in generated paths
- Proper file extension handling

---

## Testing Checklist

### Insert Date Testing

- [ ] Insert date in Monaco editor at cursor position
- [ ] Insert date in Milkdown editor at cursor position
- [ ] Insert date via tab context menu (appends to end)
- [ ] Insert date via file explorer context menu (appends to end)
- [ ] Verify correct date format (yyyy-mm-dd)
- [ ] Verify date uses local timezone
- [ ] Verify auto-save triggers after insertion
- [ ] Test with unsaved changes present
- [ ] Test with multiple files open

### Rename Testing

- [ ] Rename via tab context menu
- [ ] Rename via file explorer context menu
- [ ] Rename via editor context menu
- [ ] Rename when file with date name already exists (should append -1)
- [ ] Rename with unsaved changes (should prompt to save)
- [ ] Rename file in subdirectory (should preserve path)
- [ ] Rename with multiple tabs of same file open (all update)
- [ ] Rename and verify git commit includes change
- [ ] Rename and verify file tree updates
- [ ] Rename and verify tab label updates
- [ ] Test network failure during rename
- [ ] Test backend permission errors

### Edge Case Testing

- [ ] Rapid successive renames
- [ ] Rename during auto-save operation
- [ ] Multiple users renaming same file (if collaboration added)
- [ ] File deleted immediately after rename initiated
- [ ] Very long directory paths
- [ ] Special characters in existing filename

---

## Implementation Priority

### Phase 1: Core Functionality
1. Create date utility functions
2. Add "Insert Date" to editor context menu
3. Add "Rename File with Date" to file explorer context menu
4. Basic error handling

### Phase 2: Full Integration
5. Add date options to tab context menu
6. Add file existence checking for rename
7. Handle unsaved changes dialog

### Phase 3: Polish
8. Add all edge case handling
9. Visual feedback and animations
10. Comprehensive error messages
11. Optional keyboard shortcuts

---

## File Structure Summary

### New Files
```
frontend/src/utils/
  ├── dateUtils.ts          # Date formatting functions
  └── fileUtils.ts          # File path manipulation (may already exist)
```

### Modified Files
```
frontend/src/components/
  ├── NoteEditor.vue        # Add editor context menu with date options
  ├── NoteTabs.vue          # Add tab context menu with date options
  └── FileTree.vue          # Add file explorer context menu with date options

frontend/src/stores/
  └── notesStore.ts         # Add file rename tracking (may already exist)
```

---

## Success Criteria

✅ User can insert current date into any note via three different context menus  
✅ User can rename file to date format via three different context menus  
✅ File conflicts are handled gracefully with counter suffix  
✅ All tabs and UI elements update correctly after rename  
✅ Unsaved changes are preserved during operations  
✅ Clear error messages for all failure scenarios  
✅ No UI jank or unexpected behavior  
✅ Works consistently across Monaco and Milkdown editors  

---

## Notes for AI Agent

- Preserve existing context menu functionality
- Follow Vue 3 + TypeScript + Pinia patterns already in codebase
- Use existing API endpoints (no backend changes needed beyond validation)
- Match existing UI/UX patterns in KBase
- Leverage existing toast notification system
- Use existing modal/dialog components for confirmations
- Ensure accessibility (keyboard navigation, screen readers)
- Add appropriate ARIA labels to new menu items
- Test with both Monaco and Milkdown editors
- Consider mobile/touch interface needs (tap vs right-click)