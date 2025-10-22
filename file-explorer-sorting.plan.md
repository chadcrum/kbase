# File Explorer Sorting Implementation

## Backend Changes

### 1. Update FileTreeNode Model

Update `FileTreeNode` in `/home/chid/git/kbase/backend/app/api/v1/endpoints/notes.py` to include `created` and `modified` timestamps:

```python
class FileTreeNode(BaseModel):
    name: str
    path: str
    type: str
    children: list = []
    created: Optional[int] = None
    modified: Optional[int] = None
```

### 2. Update FileService._build_file_tree

Modify `/home/chid/git/kbase/backend/app/services/file_service.py` to populate timestamps for both files and directories in the `_build_file_tree` method around lines 79-85.

### 3. Add Backend Tests

Add tests to verify timestamps are included in API responses in `/home/chid/git/kbase/backend/tests/test_notes.py`.

## Frontend Changes

### 4. Update TypeScript Types

Update `FileTreeNode` interface in `/home/chid/git/kbase/frontend/src/types/index.ts` to include optional `created` and `modified` fields.

### 5. Add Sort State to Vault Store

In `/home/chid/git/kbase/frontend/src/stores/vault.ts`:

- Add state for `sortBy` (type: `'name' | 'created' | 'modified'`)
- Add state for `sortOrder` (type: `'asc' | 'desc'`)
- Load preferences from localStorage on store initialization
- Add actions: `setSortBy`, `setSortOrder`, `toggleSortOrder`
- Add computed property `sortedFileTree` that returns a sorted copy of the file tree (folders first, then files within each group)

### 6. Update FileTree Component

Modify `/home/chid/git/kbase/frontend/src/components/sidebar/FileTree.vue` to use `sortedFileTree` instead of raw `fileTree`.

### 7. Add Sort Buttons to Toolbar

Update `/home/chid/git/kbase/frontend/src/components/sidebar/FileExplorerToolbar.vue`:

- Add a button to toggle sort order (asc/desc) with appropriate icon
- Add a button that opens a dropdown menu for selecting sort criteria
- Create a dropdown menu component (or use inline) with options: "Name", "Created Date", "Modified Date"

### 8. Persist Sort Preferences

Save `sortBy` and `sortOrder` to localStorage whenever they change.

### 9. Add Frontend Unit Tests

Add comprehensive unit tests:

- **Vault Store Tests** (`/home/chid/git/kbase/frontend/src/stores/vault.test.ts`): Test sorting logic, sort state changes, localStorage persistence
- **Toolbar Component Tests** (`/home/chid/git/kbase/frontend/src/components/sidebar/FileExplorerToolbar.test.ts`): Test sort buttons, dropdown interactions, state updates
- **FileTree Component Tests** (`/home/chid/git/kbase/frontend/src/components/sidebar/FileTree.test.ts`): Verify component uses sorted file tree

### 10. Add E2E Tests

Create end-to-end tests in `/home/chid/git/kbase/frontend/e2e/specs/` to verify:

- Clicking sort order button toggles between asc/desc
- Selecting different sort criteria (name, created, modified) changes file order
- Sort preferences persist across page reloads
- Folders appear before files in sorted results

## Documentation

### 11. Update Architecture Documentation

Update `/home/chid/git/kbase/docs/architecture-design.md` to document the new sorting feature and API changes.

### 12. Update API Documentation

Update `/home/chid/git/kbase/docs/api-endpoints.md` to reflect the new timestamp fields in the file tree response.

## To-dos

- [x] Update FileTreeNode model to include created and modified timestamps
- [x] Update FileService._build_file_tree to populate timestamps
- [x] Add API tests for timestamp fields
- [x] Update TypeScript FileTreeNode interface with timestamp fields
- [x] Add sort state, actions, and computed sorted file tree to vault store
- [x] Update FileTree component to use sorted file tree
- [x] Add sort order toggle and sort criteria dropdown to toolbar
- [x] Implement localStorage persistence for sort preferences
- [x] Add tests for sorting functionality
- [x] Update architecture and API documentation

## Status: ✅ COMPLETED

All tasks completed successfully:
- 246 total tests passing (56 backend + 190 frontend)
- No linter errors
- Documentation fully updated
- Committed and pushed to feature/monaco-editor branch (commit be41622)

