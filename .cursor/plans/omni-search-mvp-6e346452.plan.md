<!-- 6e346452-2560-4201-97e0-47867c82ade4 541d7d20-a951-4757-bf23-094ea4cfdcb4 -->
# Omni Search MVP Implementation

## Overview

Add an Obsidian/Joplin-style omni search modal triggered by Ctrl+P or a toolbar button. Users can search through file contents and names, with results displayed in a scrollable list.

## MVP Scope

For the initial implementation, we'll focus on:

- Basic search functionality (ripgrep-based backend search)
- Modal UI with search input and results list
- File opening on selection (same editor mode as currently open)
- Keyboard shortcut (Ctrl+P/Cmd+P)
- Toolbar button trigger

**Deferred to post-MVP:**

- Match highlighting in results
- Content snippets with line numbers
- Keyboard navigation (up/down arrows)
- File tree expansion and highlighting

## Implementation Steps

### 1. Backend - Search API Endpoint

**File:** `backend/app/api/v1/endpoints/notes.py`

Add new search endpoint that:

- Accepts search query as parameter
- Splits query by spaces into phrases
- Uses ripgrep to search vault recursively
- Returns list of matching file paths (limit 50)
- Implements fuzzy matching (case-insensitive, partial matches)

**File:** `backend/app/services/file_service.py`

Add `search_notes()` method that:

- Validates search query
- Splits query into space-separated phrases
- Uses ripgrep to search both file contents AND filenames (treat filename as searchable content)
- A file matches if ALL phrases exist somewhere in the file (content or filename), not necessarily in order or on same line
- Case-insensitive, fuzzy/partial matching (e.g., "bla" matches "blasphemy")
- Processes ripgrep output to deduplicate files (each file appears only once)
- Returns structured search results (limit 50 files)

### 2. Frontend - Types and API Client

**File:** `frontend/src/types/index.ts`

Add new types:

```typescript
interface SearchResult {
  path: string
  name: string
}

interface SearchResponse {
  results: SearchResult[]
  total: number
}
```

**File:** `frontend/src/api/client.ts`

Add `searchNotes(query: string)` method to ApiClient

### 3. Frontend - Omni Search Modal Component

**File:** `frontend/src/components/common/OmniSearch.vue` (new)

Create modal component with:

- Centered overlay (backdrop)
- Search input box with autofocus
- Loading state indicator
- Results list (scrollable, max 50 items)
- Mouse click selection
- Close on Esc or backdrop click
- Debounced search (300ms)

**Styling:** Match KBase design system (blues/purples, modern gradients)

### 4. Frontend - Keyboard Shortcut Handler

**File:** `frontend/src/views/HomeView.vue`

Add global keyboard listener for:

- Ctrl+P (Windows/Linux)
- Cmd+P (Mac)
- Trigger omni search modal

### 5. Frontend - Toolbar Button

**File:** `frontend/src/components/viewer/ViewerToolbar.vue`

Add search button next to view mode toggle:

- Icon/text: "🔍" or "Search"
- Emits event to open omni search
- Consistent styling with existing toolbar buttons

### 6. Frontend - File Opening Logic

**File:** `frontend/src/components/common/OmniSearch.vue`

When file selected:

- Close modal
- Use vault store's `selectNote()` to open file
- File opens in current editor mode (Monaco vs TipTap)

## Files to Create

- `backend/app/api/v1/endpoints/notes.py` - add search endpoint
- `backend/app/services/file_service.py` - add search method
- `frontend/src/components/common/OmniSearch.vue` - new modal component

## Files to Modify

- `frontend/src/types/index.ts` - add search types
- `frontend/src/api/client.ts` - add search API method
- `frontend/src/views/HomeView.vue` - add keyboard shortcut
- `frontend/src/components/viewer/ViewerToolbar.vue` - add search button

## Post-MVP Enhancements

After MVP is working:

1. Add match highlighting in filename/content
2. Show content snippets (up to 3 lines with line numbers)
3. Keyboard navigation (↑/↓ arrows, Enter to select)
4. Expand file tree and highlight selected file
5. Better fuzzy matching algorithm
6. Performance optimizations for large vaults

### To-dos

- [ ] Create backend search endpoint and service using ripgrep
- [ ] Add search types and API client method
- [ ] Create OmniSearch modal component with search input and results list
- [ ] Add keyboard shortcut (Ctrl+P) and toolbar button
- [ ] Test end-to-end search functionality and file opening