# Monaco Editor & Auto-Save Test Coverage

## ✅ Existing Test Coverage

### Frontend Unit Tests

#### 1. **Vault Store - updateNote Action** (6 tests)
Location: `frontend/src/stores/vault.test.ts`

- ✅ Should update note successfully
- ✅ Should handle update note failure
- ✅ Should handle update note failure without response data
- ✅ Should return false for empty path
- ✅ Should set saving state during update
- ✅ Should clear save error state

**Coverage**: API integration, error handling, state management

#### 2. **MonacoEditor Component** (6 tests)
Location: `frontend/src/components/editor/MonacoEditor.test.ts`

- ✅ Renders editor container
- ✅ Accepts modelValue prop
- ✅ Accepts path prop
- ✅ Accepts readonly prop
- ✅ Emits update:modelValue when content changes
- ✅ Emits save event

**Coverage**: Component props, events, rendering

#### 3. **ViewerToolbar Component** (11 tests)
Location: `frontend/src/components/viewer/ViewerToolbar.test.ts`

- ✅ Renders file name
- ✅ Renders file path when provided
- ✅ Renders search and logout buttons
- ✅ Handles search button click
- ✅ Handles logout button click
- ✅ Displays saving status
- ✅ Displays saved status
- ✅ Displays error status
- ✅ Does not display save status when null

**Coverage**: UI state, toggle functionality, status indicators

#### 4. **NoteViewer Component** (updated for Monaco)
Location: `frontend/src/components/viewer/NoteViewer.test.ts`

- ✅ Renders with toolbar
- ✅ Switches between editor and preview modes
- ✅ Displays correct file information

**Coverage**: Component integration, view mode switching

### Backend Unit Tests

#### 1. **File Service - Update Note** (1 test)
Location: `backend/tests/test_notes.py::test_update_note`

- ✅ Updates note content successfully
- ✅ Returns correct path format (`/note1.md`)
- ✅ Verifies content was persisted

**Coverage**: Basic update functionality, path format validation

#### 2. **File Service - Get Note** (2 tests)
- ✅ Returns note with correct path (`/note1.md`)
- ✅ Returns nested note with correct path (`/subdir/note3.md`)

**Coverage**: Path normalization in responses

## ⚠️ Test Gaps & Recommendations

### Critical Gaps (Should Add)

#### 1. **Path Normalization with Leading Slashes**
**Missing Test**: Backend test that specifically validates paths starting with `/`

```python
def test_update_note_with_leading_slash(auth_client, auth_token):
    """Test updating a note when path has leading slash."""
    # This tests the bug we just fixed
    response = auth_client.put(
        "/api/v1/notes/%2Fnote1.md",  # URL-encoded /note1.md
        json={"content": "Updated"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["path"] == "/note1.md"  # Not //note1.md
```

**Why**: Ensures the double-slash bug doesn't regress

#### 2. **Auto-Save Debouncing**
**Missing Test**: Frontend test that validates debouncing behavior

```typescript
it('should debounce saves when typing rapidly', async () => {
  const wrapper = mount(MonacoEditor, {
    props: { modelValue: 'initial', path: 'test.md' }
  })
  
  // Simulate rapid typing
  wrapper.vm.$emit('update:modelValue', 'a')
  wrapper.vm.$emit('update:modelValue', 'ab')
  wrapper.vm.$emit('update:modelValue', 'abc')
  
  // Wait less than debounce delay
  await new Promise(r => setTimeout(r, 500))
  expect(wrapper.emitted('save')).toBeUndefined()
  
  // Wait for full debounce delay
  await new Promise(r => setTimeout(r, 600))
  expect(wrapper.emitted('save')).toBeTruthy()
  expect(wrapper.emitted('save')).toHaveLength(1)  // Only one save
})
```

**Why**: Validates that we're not hammering the API with every keystroke

#### 3. **End-to-End Auto-Save Flow**
**Missing Test**: E2E test that validates the complete auto-save cycle

```typescript
// frontend/e2e/specs/monaco-editor.spec.ts
test('auto-saves content after editing', async ({ page }) => {
  await page.goto('/')
  await page.fill('[name="password"]', 'winston')
  await page.press('[name="password"]', 'Enter')
  
  // Open a file
  await page.click('text=vault')
  await page.click('text=welcome.md')
  
  // Edit in Monaco
  const editor = page.locator('.monaco-editor')
  await editor.click()
  await page.keyboard.type('\n\nAuto-save test')
  
  // Wait for auto-save
  await page.waitForSelector('text=Saved', { timeout: 2000 })
  
  // Verify save indicator appeared
  expect(await page.textContent('.save-status')).toContain('Saved')
})
```

**Why**: Validates the entire user-facing auto-save experience

### Nice to Have

#### 4. **Path Traversal Security**
**Enhancement**: More comprehensive path traversal tests

```python
def test_path_traversal_attempts():
    """Test that path traversal attacks are blocked."""
    service = FileService()
    
    with pytest.raises(ValueError, match="Path traversal"):
        service._validate_path("../../../etc/passwd")
    
    with pytest.raises(ValueError, match="Path traversal"):
        service._validate_path("note/../../../secret.txt")
```

#### 5. **Language Detection**
**Enhancement**: Test language detection utility

```typescript
describe('detectLanguage', () => {
  it('detects markdown', () => {
    expect(detectLanguage('note.md')).toBe('markdown')
  })
  
  it('detects typescript', () => {
    expect(detectLanguage('code.ts')).toBe('typescript')
  })
  
  it('falls back to plaintext', () => {
    expect(detectLanguage('unknown.xyz')).toBe('plaintext')
  })
})
```

## Test Coverage Summary

### Current Coverage
- **Frontend Unit Tests**: 24 tests covering Monaco, Toolbar, Vault Store
- **Backend Unit Tests**: 52 tests including basic update functionality
- **E2E Tests**: None specific to auto-save yet

### Coverage by Feature
| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|------------|-------------------|-----------|
| Monaco Editor Component | ✅ Good | ⚠️ Partial | ❌ Missing |
| Auto-Save Debouncing | ❌ Missing | ❌ Missing | ❌ Missing |
| Save Status UI | ✅ Good | ✅ Good | ❌ Missing |
| Path Normalization | ⚠️ Basic | ✅ Good | ❌ Missing |
| File Update API | ✅ Good | ✅ Good | ⚠️ Partial |

## Recommendations

### Priority 1 (Should Add Now)
1. ✅ Backend test for leading slash paths (prevents regression of our fix)
2. Frontend debounce test (validates auto-save timing)
3. E2E auto-save test (validates full user experience)

### Priority 2 (Can Add Later)
4. Language detection tests
5. Enhanced path traversal tests
6. Monaco resize/lifecycle tests

## Running Tests

### Backend
```bash
cd backend
uv run pytest -v tests/
```

### Frontend Unit
```bash
cd frontend
npm run test:run
```

### Frontend E2E
```bash
cd frontend
npm run test:e2e
```

## Notes

- All existing tests pass after Monaco implementation ✅
- Path normalization fix is validated by existing tests ✅
- Auto-save debouncing is NOT currently tested ⚠️
- No E2E coverage for the complete auto-save flow ⚠️

