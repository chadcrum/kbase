# Manual Test Checklist - Editor Sync Simplification

## Test Environment
- Frontend dev server running on: http://localhost:5173
- Backend server running on: http://localhost:8000

## Critical Tests for Editor Sync

### Test 1: Bullet List Text Preservation (Previously Broken)
**Steps:**
1. Open any `.md` file (starts in TipTap WYSIWYG editor)
2. Create a bullet list:
   ```
   - First item with text
   - Second item with text
   - Third item with text
   ```
3. Click the "Code" (`</>`) button to switch to Monaco editor
4. **Verify:** All text in bullet points is visible and preserved

**Expected Result:** ✅ All text appears correctly in Monaco
**Previous Bug:** ❌ Bullets remained but text disappeared

---

### Test 2: Checkbox List Text Preservation (Previously Broken)
**Steps:**
1. Open any `.md` file (starts in TipTap WYSIWYG editor)
2. Create a checkbox list:
   ```
   - [ ] Unchecked item with text
   - [x] Checked item with text
   - [ ] Another unchecked item
   ```
3. Click the "Code" (`</>`) button to switch to Monaco editor
4. **Verify:** All text in checkbox items is visible and preserved

**Expected Result:** ✅ All text appears correctly with checkboxes in Monaco
**Previous Bug:** ❌ Checkboxes remained but text disappeared

---

### Test 3: Monaco to TipTap Sync
**Steps:**
1. Open any `.md` file
2. Switch to Monaco editor (Code view)
3. Type markdown content:
   ```markdown
   # Heading
   
   This is a paragraph with **bold** and *italic* text.
   
   - List item 1
   - List item 2
   ```
4. Wait for auto-save (1 second)
5. Click the "Markdown" (`Md`) button to switch to TipTap
6. **Verify:** Content renders correctly with proper formatting

**Expected Result:** ✅ All content appears with correct formatting in TipTap

---

### Test 4: Rapid Editor Switching (Stress Test)
**Steps:**
1. Open any `.md` file with some content
2. Quickly switch between editors 10 times:
   - Click Code → Markdown → Code → Markdown (repeat)
3. **Verify:** No errors in console, content remains intact

**Expected Result:** ✅ Smooth switching, no data loss, no console errors
**Previous Issue:** ⚠️ Race conditions could cause issues with rapid switching

---

### Test 5: Unsaved Changes Preservation
**Steps:**
1. Open any `.md` file
2. In TipTap, type: "Changes in TipTap"
3. Immediately switch to Monaco (before auto-save)
4. **Verify:** Text "Changes in TipTap" appears in Monaco
5. Type more text in Monaco: " and more in Monaco"
6. Switch back to TipTap
7. **Verify:** Full text "Changes in TipTap and more in Monaco" appears

**Expected Result:** ✅ All unsaved changes preserved in both directions

---

### Test 6: Multiple Files Switch
**Steps:**
1. Open file A, make changes in TipTap
2. Switch to file B via file explorer
3. Switch to Monaco editor
4. Make changes in Monaco
5. Switch back to file A
6. **Verify:** Original changes in file A are preserved
7. Switch back to file B
8. **Verify:** Changes in file B are preserved

**Expected Result:** ✅ Each file maintains its content independently

---

### Test 7: Auto-Save Works in Both Editors
**Steps:**
1. Open any `.md` file
2. In TipTap, make changes and wait 1 second
3. **Verify:** "Saved" status appears in toolbar
4. Switch to Monaco
5. Make changes and wait 1 second
6. **Verify:** "Saved" status appears in toolbar

**Expected Result:** ✅ Auto-save works correctly in both editors

---

### Test 8: Complex Content (Comprehensive)
**Steps:**
1. Create a new note with ALL markdown elements:
   ```markdown
   # Heading 1
   ## Heading 2
   
   Paragraph with **bold**, *italic*, and `code`.
   
   - Bullet item 1
   - Bullet item 2
     - Nested bullet
   
   1. Ordered item 1
   2. Ordered item 2
   
   - [ ] Todo item 1
   - [x] Completed item
   
   > Blockquote text
   
   ```
   Code block with content
   ```
   ```
2. Switch between editors multiple times
3. **Verify:** All elements render correctly in both views
4. **Verify:** No text is lost anywhere

**Expected Result:** ✅ All markdown elements preserved perfectly

---

## Performance Checks

### Test 9: Editor Switching Speed
**Steps:**
1. Open a large file (>1000 lines)
2. Switch from TipTap to Monaco
3. Note the switching speed

**Expected Result:** ✅ **Faster** than before (no remounting delay)
**Improvement:** Should be near-instantaneous

---

### Test 10: Memory Usage
**Steps:**
1. Open DevTools → Performance Monitor
2. Switch between editors 20 times
3. **Verify:** No memory leaks (memory should stabilize)

**Expected Result:** ✅ Stable memory usage, no leaks

---

## Regression Tests

### Test 11: Read-Only Mode Still Works
**Steps:**
1. Verify readonly files cannot be edited in either editor

**Expected Result:** ✅ Readonly mode respected

---

### Test 12: Language Detection (Monaco)
**Steps:**
1. Open a `.js` file (should default to Monaco)
2. **Verify:** Syntax highlighting works
3. Switch to TipTap
4. **Verify:** Content still editable
5. Switch back to Monaco
6. **Verify:** Syntax highlighting restored

**Expected Result:** ✅ Language detection works correctly

---

## Bug Verification

### ✅ Fixed: List Text Disappearing
- **Before:** Creating lists in TipTap and switching to Monaco caused text to disappear
- **After:** Text correctly preserved in all list types

### ✅ Fixed: Race Conditions
- **Before:** Rapid switching could cause content loss or errors
- **After:** Smooth, reliable switching with no issues

### ✅ Fixed: Complex Flag Management
- **Before:** 100+ lines of complex flag logic prone to edge cases
- **After:** Simple, reliable disabled prop mechanism

---

## Console Verification

**During all tests, verify:**
- ❌ No errors in browser console
- ❌ No warnings about v-model or watchers
- ❌ No "Maximum update depth exceeded" errors

---

## Summary

All tests should pass with the new v-show architecture. The key improvements are:

1. **Reliability:** No more data loss
2. **Simplicity:** 100 lines of complexity removed
3. **Performance:** Faster switching (no remounting)
4. **Maintainability:** Much easier to understand and debug

If any test fails, check:
1. Is the disabled prop correctly passed?
2. Is the disabled check present in all update handlers?
3. Are both editors properly mounted?
4. Is v-show (not v-if) being used?

