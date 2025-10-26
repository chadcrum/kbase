# Manual Test Checklist - Monaco Editor

## Test Environment
- Frontend dev server running on: http://localhost:5173
- Backend server running on: http://localhost:8000

## Critical Tests for Monaco Editor

### Test 1: Monaco Editor for Markdown Files
**Steps:**
1. Open any `.md` file (opens in Monaco editor)
2. Type some content with markdown formatting:
   ```markdown
   # Heading
   
   This is **bold** text and *italic* text.
   
   - List item 1
   - List item 2
   ```
3. **Verify:** Syntax highlighting works correctly
4. **Verify:** Auto-save works (see "Saved" status in toolbar)

**Expected Result:** ✅ Monaco editor provides syntax highlighting and auto-save

---

### Test 2: Monaco Editor for Code Files
**Steps:**
1. Open any non-markdown file (e.g., `.js`, `.py`, `.json`)
2. Type code content
3. **Verify:** Appropriate syntax highlighting for file type
4. **Verify:** Auto-save works correctly

**Expected Result:** ✅ Syntax highlighting matches file type

---

### Test 3: Auto-Save Functionality
**Steps:**
1. Open any file
2. Make changes to content
3. Wait 1 second without typing
4. **Verify:** "Saving..." status appears briefly
5. **Verify:** "Saved" status appears and remains for 2 seconds
6. Reload the page
7. **Verify:** Changes were persisted

**Expected Result:** ✅ Auto-save works with proper status feedback

---

### Test 4: Rapid Typing (Debounce Test)
**Steps:**
1. Open any file
2. Type rapidly for several seconds
3. **Verify:** No excessive API calls (check Network tab)
4. Stop typing and wait 1 second
5. **Verify:** Auto-save triggers once

**Expected Result:** ✅ Debouncing prevents excessive saves

---

### Test 5: Multiple Files Switch
**Steps:**
1. Open file A, make changes
2. Switch to file B via file explorer
3. Make changes in file B
4. Switch back to file A
5. **Verify:** Original changes in file A are preserved

**Expected Result:** ✅ Each file maintains its content independently

---

### Test 6: Complex Content (Comprehensive)
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
2. Save and reload
3. **Verify:** All content is preserved correctly

**Expected Result:** ✅ All markdown elements preserved perfectly

---

## Performance Checks

### Test 7: Editor Loading Speed
**Steps:**
1. Open a large file (>1000 lines)
2. Note the loading speed

**Expected Result:** ✅ Fast loading with Monaco

---

### Test 8: Memory Usage
**Steps:**
1. Open DevTools → Performance Monitor
2. Open multiple files
3. **Verify:** No memory leaks

**Expected Result:** ✅ Stable memory usage

---

## Regression Tests

### Test 9: Read-Only Mode
**Steps:**
1. Open a read-only file (if applicable)
2. **Verify:** Editor is disabled

**Expected Result:** ✅ Readonly mode respected

---

### Test 10: Language Detection
**Steps:**
1. Open files with different extensions (.md, .js, .py, .json)
2. **Verify:** Appropriate syntax highlighting for each

**Expected Result:** ✅ Language detection works correctly

---

## Console Verification

**During all tests, verify:**
- ✅ No errors in browser console
- ✅ No warnings about v-model or watchers
- ✅ No "Maximum update depth exceeded" errors

---

## Summary

All tests should pass with the Monaco-only editor setup. Key features:

1. **Syntax Highlighting:** Works for all supported file types
2. **Auto-Save:** 1-second debounce with visual feedback
3. **Performance:** Fast loading and efficient memory usage
4. **Reliability:** Content preserved across file switches

If any test fails, check:
1. Is the Monaco editor properly initialized?
2. Are save events being emitted correctly?
3. Is the API responding correctly?
4. Is localStorage working properly?

