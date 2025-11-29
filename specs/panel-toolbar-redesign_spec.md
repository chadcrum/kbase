# KBase Toolbar Redesign - Implementation Specification

## Overview
This specification details the complete redesign of the note panel toolbar in the KBase application. The new toolbar consolidates the current two-bar layout (tabs + toolbar) into a unified, fixed two-row structure that works across both Markdown and Text editors.

---

## Visual Reference
**Current State:** Two separate bars (tab list + file path banner)
**New State:** Single unified toolbar with two rows (title row + actions row)

```
┌─────────────────────────────────────────────────────────────┐
│ [☰] [3▼] Note Title Here    /path/to/file.md          [×]  │ ← Row 1: Navigation
├─────────────────────────────────────────────────────────────┤
│ [B] [I] [H] [•] [Code] [⋯]                    [⚙] [🔍]    │ ← Row 2: Actions
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture (Verified Against Codebase)

**Current Implementation:**
- **Framework:** Vue 3 with TypeScript (Composition API with `<script setup>`)
- **Styling:** CSS with CSS custom properties (variables like `--bg-primary`, `--text-secondary`)
- **State Management:** Pinia stores (`ui.ts`, `tabs.ts`, `editor.ts`, `vault.ts`)
- **Component Structure:** Vue Single File Components (.vue files)
- **Icons:** Unicode/Emoji characters (no icon library)
- **File Structure:** `frontend/src/components/viewer/` for note viewing components

**Current Two-Bar System:**
- [`TabsBar.vue`](frontend/src/components/viewer/TabsBar.vue:1) - Tabs + sidebar toggle + editor toggle + search + tabs dropdown
- [`ViewerToolbar.vue`](frontend/src/components/viewer/ViewerToolbar.vue:1) - File path/name display
- [`NoteViewer.vue`](frontend/src/components/viewer/NoteViewer.vue:1) - Container that includes both

---

## Phase 1: Component Structure & Setup

### Goals
- Create new toolbar component structure
- Set up proper state management
- Establish responsive breakpoints

### Tasks

#### 1.1 Create New Toolbar Component
```
[ ] Create `NoteToolbar.vue` component
[ ] Create `NoteToolbarTop.vue` subcomponent (Row 1: Navigation)
[ ] Create `NoteToolbarActions.vue` subcomponent (Row 2: Actions)
```

**Component Locations:**
- Components location: `frontend/src/components/viewer/`
- Types: Inline TypeScript interfaces in `<script setup>` blocks (Vue 3 pattern)

#### 1.2 Define TypeScript Interfaces
```typescript
// In NoteToolbar.vue <script setup lang="ts">

[ ] Define interface for toolbar props
interface Props {
  filePath?: string
  isPopup?: boolean
}

[ ] Define interface for editor actions
interface EditorAction {
  id: string
  icon: string // Unicode/emoji characters
  label: string
  onClick: () => void
  shortcut?: string
  hideOnMobile?: boolean
}

[ ] Define interface for toolbar state (using refs)
// State managed in component with refs, global state in Pinia stores
```

**State Management:**
- Sidebar state: [`useUIStore()`](frontend/src/stores/ui.ts:6) - `sidebarCollapsed`, `activeMobilePane`, `isMobileView`
- Tabs state: [`useTabsStore()`](frontend/src/stores/tabs.ts:92) - `tabs`, `activeTabId`
- Editor state: [`useEditorStore()`](frontend/src/stores/editor.ts:11) - `markdownEditor`, `getEditorForFile()`
- Vault state: [`useVaultStore()`](frontend/src/stores/vault.ts:91) - `selectedNote`, `isSidebarCollapsed`, `sidebarWidth`

#### 1.3 Set Up Responsive Breakpoints
```
[ ] Use existing responsive breakpoints from current implementation:
    - Mobile: < 768px (handled by useUIStore().isMobileView)
    - Desktop: 768px+ (standard desktop behavior)
[ ] Leverage existing CSS custom properties for theming
[ ] Use existing mobile pane system (sidebar/editor toggle on mobile)
```

---

## Phase 2: Top Row Implementation (Navigation)

### Goals
- Implement hamburger menu + tab counter + title + path + close
- Make toolbar sticky/fixed
- Implement responsive hiding of file path

### Tasks

#### 2.1 Create NoteToolbarTop Component
```vue
[ ] Create component skeleton with <script setup lang="ts">
[ ] Use Unicode/emoji characters for icons (no icon library)
[ ] Accept props: filePath, isPopup
[ ] Import stores: useUIStore, useTabsStore, useVaultStore
```

#### 2.2 Implement Top Row Layout
```vue
[ ] Create flex container with border-bottom using CSS custom properties
[ ] Add responsive padding following existing patterns
[ ] Implement fixed positioning (position: fixed) matching current toolbar behavior
[ ] Use existing CSS variables: --toolbar-left, --tabs-bar-height
```

**Layout Structure:**
```
[ ] Left section (flex items-center gap-2 sm:gap-3):
    [ ] Hamburger button (☰)
    [ ] Tab counter dropdown (3▼)
    [ ] Note title (truncated with ellipsis)
[ ] Right section:
    [ ] File path (hidden on mobile: hidden md:block)
    [ ] Close button (×)
```

#### 2.3 Implement Individual Elements

**Hamburger Menu:**
```
[ ] Create button with toggle icon «/» (matches current TabsBar implementation)
[ ] Add hover state using CSS custom properties (hover:bg-var(--bg-tertiary))
[ ] Connect to uiStore.toggleSidebar() callback
[ ] Add tooltip using title attribute
[ ] Size: match existing .sidebar-toggle-btn styles
```

**Tab Counter Dropdown:**
```
[ ] Reuse existing tabs dropdown from TabsBar.vue
[ ] Show tab count with 📋 icon (matches current implementation)
[ ] Compact sizing: match existing .tabs-dropdown-btn styles
[ ] Add hover state
[ ] Connect to existing tabs dropdown functionality
```

**Tab Dropdown Implementation:**
- Reuse existing [`TabsBar.vue`](frontend/src/components/viewer/TabsBar.vue:66) tabs dropdown logic
- Shows dropdown with all tabs, active tab highlighting, close buttons
- Already handles mobile/desktop responsive behavior

**Note Title:**
```
[ ] Display note title extracted from filePath using existing getNoteTitle() function
[ ] Font: match existing typography patterns
[ ] Truncate with ellipsis (text-overflow: ellipsis)
[ ] Color: var(--text-primary)
[ ] Make flex-1 to fill available space
```

**File Path:**
```
[ ] Display file path (reuse existing ViewerToolbar logic)
[ ] Font: match existing .file-path styles (0.75rem, Monaco font)
[ ] Color: var(--text-secondary)
[ ] Truncate with text-overflow: ellipsis
[ ] Hide on mobile: use existing responsive pattern (display: none on mobile)
```

**Close Button:**
```
[ ] Create button with × icon (matches current tab close buttons)
[ ] Add hover state using CSS custom properties
[ ] Connect to tabsStore.closeTab() for current tab
[ ] Size: match existing .tab-close styles
```

---

## Phase 3: Bottom Row Implementation (Actions)

### Goals
- Implement editor-specific action buttons
- Create button group for Markdown editor
- Create button group for Text editor
- Add Settings and Omni Search buttons

### Tasks

#### 3.1 Create NoteToolbarActions Component
```vue
[ ] Create component skeleton with <script setup lang="ts">
[ ] Accept props: filePath
[ ] Use Unicode/emoji characters for all icons
[ ] Import stores: useEditorStore, useVaultStore
```

#### 3.2 Implement Actions Row Layout
```vue
[ ] Create flex container with justify-between
[ ] Add responsive padding matching existing toolbar patterns
[ ] Left section: editor action buttons (markdown only)
[ ] Right section: editor toggle + search (reuse existing from TabsBar)
```

#### 3.3 Define Editor Action Configurations

**Markdown Editor Actions:**
```
[ ] Define action array for Milkdown editor:
    [ ] Bold (B icon) - trigger editor formatting
    [ ] Italic (I icon) - trigger editor formatting
    [ ] Heading (H icon) - trigger editor formatting
    [ ] Separator (| character)
    [ ] Bullet List (• icon) - trigger editor formatting
    [ ] Code Block (</> icon) - trigger editor formatting
    [ ] Separator
    [ ] More Actions (⋯ icon) - open additional actions menu
```

**Text Editor (CodeMirror) Actions:**
```
[ ] Define action array for CodeMirror editor:
    [ ] Minimal actions (CodeMirror has its own toolbar/context menus)
    [ ] Focus on editor toggle and search functionality
```

**Editor Integration:**
- Actions should trigger formatting in the active editor ([`MilkdownEditor.vue`](frontend/src/components/editor/MilkdownEditor.vue:1) or [`CodeMirrorEditor.vue`](frontend/src/components/editor/CodeMirrorEditor.vue:1))
- Editor state managed in [`useEditorStore()`](frontend/src/stores/editor.ts:11)
- Use editor refs to call formatting methods
- Milkdown editor has extensive plugin system and command infrastructure (see lines 24-33, 158-182)
- CodeMirror editor has its own API for formatting operations

#### 3.4 Implement Action Buttons
```
[ ] Create reusable ActionButton component (or use existing button patterns)
[ ] Button styling: match existing .editor-toggle-btn, .search-btn patterns
[ ] Icon sizing: match existing icon sizes
[ ] Color: var(--text-primary) with hover states
[ ] Add tooltips using title attributes
[ ] Implement responsive behavior using existing mobile patterns
```

#### 3.5 Implement Right-Side Buttons

**Editor Toggle Button:**
```
[ ] Reuse existing editor toggle from TabsBar.vue
[ ] Shows ✏️/📝 icons based on current editor
[ ] Connect to editorStore.toggleMarkdownEditor()
```

**Search Button:**
```
[ ] Reuse existing search button from TabsBar.vue
[ ] 🔍 icon with "Search (Ctrl+P)" tooltip
[ ] Connect to emit('openSearch') to trigger OmniSearch component
[ ] OmniSearch already implemented as [`OmniSearch.vue`](frontend/src/components/common/OmniSearch.vue:1)
```

**Search Integration:**
- OmniSearch opens as modal overlay (already implemented in [`OmniSearch.vue`](frontend/src/components/common/OmniSearch.vue:1))
- Searches both file names and content with highlighting (see lines 176-186)
- Keyboard shortcut Ctrl+P already handled in TabsBar.vue
- Supports preview modal and keyboard navigation (see lines 352-389)

---

## Phase 4: Integration & Cleanup

### Goals
- Replace old toolbar implementation
- Wire up state management
- Handle sidebar toggle functionality
- Test responsive behavior

### Tasks

#### 4.1 Component Integration
```
[ ] Locate existing note panel component: [`NoteViewer.vue`](frontend/src/components/viewer/NoteViewer.vue:1)
[ ] Import new NoteToolbar component
[ ] Replace existing TabsBar + ViewerToolbar with unified NoteToolbar
[ ] Pass required props: filePath, isPopup
[ ] Remove separate TabsBar and ViewerToolbar imports
```

**Integration Details:**
- Main note panel component: [`frontend/src/components/viewer/NoteViewer.vue`](frontend/src/components/viewer/NoteViewer.vue:1)
- Current note data: from `vaultStore.selectedNote`
- File path: `selectedNote?.path`
- Note title: use existing `getNoteTitle()` function

#### 4.2 Sidebar State Management
```
[ ] Use existing sidebar state: [`useUIStore()`](frontend/src/stores/ui.ts:6)
[ ] Connect to existing uiStore.toggleSidebar() function
[ ] Leverage existing mobile pane system (activeMobilePane)
[ ] Sidebar preference already handled by existing implementation
```

**Sidebar State:**
- Location: [`frontend/src/stores/ui.ts`](frontend/src/stores/ui.ts:8) - `sidebarCollapsed`, `activeMobilePane`
- Persistence: Already handled by existing implementation
- Mobile behavior: Already implemented with pane switching

#### 4.3 Tab Management Integration
```
[ ] Use existing tab management: [`useTabsStore()`](frontend/src/stores/tabs.ts:92)
[ ] Get tab count: tabsStore.tabs.length
[ ] Reuse existing tabs dropdown from TabsBar.vue
[ ] Connect to existing tab switching: tabsStore.setActiveTab()
```

**Tab Management:**
- System: [`frontend/src/stores/tabs.ts`](frontend/src/stores/tabs.ts:92) - full tab management with localStorage persistence
- Tab list: Already handled by existing TabsBar dropdown implementation
- Tab switching: `tabsStore.setActiveTab(tabId)` + `vaultStore.loadNote(tab.path)`

#### 4.4 Editor Action Callbacks
```
[ ] Wire up Markdown editor actions for Milkdown:
    [ ] Bold formatting - call Milkdown editor methods
    [ ] Italic formatting - call Milkdown editor methods
    [ ] Heading insertion - call Milkdown editor methods
    [ ] List insertion - call Milkdown editor methods
    [ ] Code block insertion - call Milkdown editor methods
[ ] CodeMirror actions: Minimal (CodeMirror has its own shortcuts)
```

**Editor Integration:**
- Milkdown: [`frontend/src/components/editor/MilkdownEditor.vue`](frontend/src/components/editor/MilkdownEditor.vue:1) - use editor.action() to call commands (see lines 104-121)
- CodeMirror: [`frontend/src/components/editor/CodeMirrorEditor.vue`](frontend/src/components/editor/CodeMirrorEditor.vue:1) - use CodeMirror API
- Formatting: Expose formatting methods from editors and call via refs
- Milkdown has command system: use `ctx.get(commandsCtx)` to access formatting commands

#### 4.5 Remove Old Toolbar Code
```
[ ] Remove/replace existing toolbar components:
    [ ] [`TabsBar.vue`](frontend/src/components/viewer/TabsBar.vue:1) - functionality moved to NoteToolbar
    [ ] [`ViewerToolbar.vue`](frontend/src/components/viewer/ViewerToolbar.vue:1) - functionality moved to NoteToolbar
[ ] Update NoteViewer.vue imports and template
[ ] Remove unused CSS classes if any
[ ] Update tests that reference old components
```

**Files to Modify/Remove:**
- Keep components but refactor: TabsBar.vue, ViewerToolbar.vue
- Update: NoteViewer.vue template and imports
- Update: Related test files

---

## Phase 5: Styling & Polish

### Goals
- Ensure consistent dark theme
- Verify responsive behavior
- Add transitions and hover states
- Test on all screen sizes

### Tasks

#### 5.1 Apply Consistent Styling
```
[ ] Verify color scheme matches existing app theme:
    [ ] Background: var(--bg-secondary), var(--bg-primary)
    [ ] Borders: var(--border-color)
    [ ] Text: var(--text-primary), var(--text-secondary), var(--text-tertiary)
    [ ] Hover: var(--bg-tertiary) background
[ ] Ensure all buttons use existing sizing patterns
[ ] Verify icon sizes match existing patterns (emoji-based)
[ ] Use existing CSS custom properties throughout
```

#### 5.2 Add Transitions
```
[ ] Sidebar collapse/expand (reuse existing transition: left 0.3s ease)
[ ] Button hover states (reuse existing transition patterns)
[ ] Mobile responsive transitions (match existing mobile behavior)
[ ] Use existing CSS transitions from current toolbar implementation
```

#### 5.3 Test Responsive Behavior
```
[ ] Test on mobile (< 768px):
    [ ] File path hidden (matches current ViewerToolbar behavior)
    [ ] Mobile pane switching active (sidebar/editor toggle)
    [ ] Touch-friendly button sizes (match existing mobile patterns)
    [ ] Single pane display (existing mobile behavior)
[ ] Test on desktop (768px+):
    [ ] All elements visible
    [ ] Sidebar collapse/expand functionality
    [ ] Dual pane layout
    [ ] Sidebar preference remembered (existing behavior)
```

#### 5.4 Accessibility
```
[ ] Verify all buttons have title attributes (existing pattern)
[ ] Test keyboard navigation (reuse existing keyboard shortcuts)
[ ] Verify focus states visible (use existing focus styles)
[ ] Test with screen reader (maintain existing ARIA patterns)
[ ] Ensure semantic HTML structure maintained
```

---

## Phase 6: Testing & Documentation

### Goals
- Test all functionality
- Update any existing tests
- Document new component API

### Tasks

#### 6.1 Functional Testing
```
[ ] Test hamburger menu:
    [ ] Sidebar toggle works (desktop collapse/expand)
    [ ] Mobile pane switching works (sidebar ↔ editor)
    [ ] State persists correctly
[ ] Test tab counter dropdown:
    [ ] Shows correct tab count
    [ ] Click opens existing tabs dropdown
    [ ] Tab switching works from dropdown
[ ] Test close button:
    [ ] Closes current tab
    [ ] Updates tab count
    [ ] Handles last tab correctly
[ ] Test editor toggle:
    [ ] Switches between Milkdown/CodeMirror
    [ ] Icon updates correctly
[ ] Test search button:
    [ ] Opens OmniSearch modal
    [ ] Ctrl+P keyboard shortcut works
[ ] Test editor actions (markdown):
    [ ] Formatting buttons work in Milkdown (use editor.action() with commands)
    [ ] Actions disabled/hidden in CodeMirror (CodeMirror has its own shortcuts)
    [ ] Test all formatting: bold, italic, heading, list, code block
```

#### 6.2 Edge Case Testing
```
[ ] Test with very long note titles (truncation - existing behavior)
[ ] Test with very long file paths (truncation - existing behavior)
[ ] Test with 1 tab (dropdown shows single tab)
[ ] Test with many tabs (10+ - dropdown scrolling)
[ ] Test rapid toggling of sidebar/mobile panes
[ ] Test switching between editor types (Milkdown ↔ CodeMirror)
[ ] Test popup mode (isPopup=true)
[ ] Test with no note selected
[ ] Test with untitled notes
```

#### 6.3 Update Tests
```
[ ] Update unit tests for new NoteToolbar components
[ ] Update existing tests: NoteViewer.test.ts, TabsBar.test.ts, ViewerToolbar.test.ts
[ ] Add new tests for unified toolbar functionality
[ ] Update e2e tests that reference old toolbar structure
[ ] Test responsive behavior with existing mobile test patterns
```

**Test Framework:**
- Unit tests: Vitest with Vue Test Utils
- E2E tests: Playwright
- Test locations: `frontend/src/components/viewer/*.test.ts`, `frontend/e2e/specs/*.spec.ts`

#### 6.4 Documentation
```
[ ] Update component documentation in Vue SFC blocks
[ ] Document props and emits using TypeScript interfaces
[ ] Add usage examples in component comments
[ ] Update relevant documentation files if needed
[ ] Ensure JSDoc comments are comprehensive
```

---

## Implementation Notes for AI Agent

### Before Starting
1. Read through entire spec (now customized for KBase)
2. All ARCHITECT NOTES filled with actual implementation details
3. Verify all dependencies are installed (Vue 3, Pinia, TypeScript already in use)
4. Create feature branch: `feature/toolbar-redesign`
5. Review existing toolbar components and their functionality

### During Implementation
1. Complete phases in order (don't skip ahead)
2. Check off tasks as completed
3. Commit after each phase with descriptive messages
4. Test functionality after each phase
5. Run existing test suite to ensure no regressions
6. Test on both mobile and desktop viewports
7. Verify all existing functionality is preserved

### After Completion
1. Run full test suite (`npm run test`)
2. Run type checking (`npm run type-check`)
3. Test on multiple screen sizes (mobile <768px, desktop 768px+)
4. Test both editors (Milkdown and CodeMirror)
5. Create pull request with:
   - Summary of changes
   - Screenshots/video of new unified toolbar
   - List of breaking changes (should be minimal - mostly internal refactoring)
6. Request code review
7. Update documentation if needed

---

## Key Design Principles

1. **Fixed Toolbar:** Toolbar must remain fixed at top while content scrolls (existing behavior)
2. **Responsive First:** Must work seamlessly on mobile (<768px) and desktop (768px+)
3. **Consistent Layout:** Same structure for both editor types (only action buttons differ)
4. **Clean Separation:** Clear two-row structure (navigation vs actions)
5. **Touch Friendly:** Adequate button sizes for mobile touch (existing patterns)
6. **Performance:** No unnecessary re-renders of toolbar (Vue 3 reactivity optimization)
7. **Backward Compatibility:** Preserve all existing functionality and shortcuts

---

## Rollback Plan

If issues arise:
```
[ ] Keep old toolbar components temporarily (TabsBar.vue, ViewerToolbar.vue)
[ ] Use conditional rendering in NoteViewer.vue to switch between old/new
[ ] Document exact files changed for easy revert
[ ] Git branches allow easy rollback if needed
```

**Rollback Strategy:**
- Use git to revert changes: `git revert <commit-hash>`
- Components are self-contained, minimal impact on other parts
- Existing tests provide safety net

---

## Success Criteria

The implementation is complete when:
- [ ] All checkboxes in this spec are completed
- [ ] Unified toolbar works on mobile (<768px) and desktop (768px+)
- [ ] All existing functionality preserved (tabs, sidebar, search, editor toggle)
- [ ] Editor actions work correctly in Milkdown editor
- [ ] Sidebar/mobile pane toggling works properly
- [ ] No console errors or TypeScript errors
- [ ] All existing tests pass + new tests for unified toolbar
- [ ] Type checking passes (`npm run type-check`)
- [ ] Code reviewed and approved
- [ ] Responsive behavior verified on multiple screen sizes

---

## Questions for Architect - ANSWERED

All questions have been answered based on actual codebase analysis:

1. **Component Locations:** ✅
   - New toolbar components: `frontend/src/components/viewer/`
   - Current note panel: `frontend/src/components/viewer/NoteViewer.vue`

2. **State Management:** ✅
   - Pinia stores: `ui.ts`, `tabs.ts`, `editor.ts`, `vault.ts`
   - Sidebar state: `useUIStore()` with mobile pane system
   - Preferences already persist to localStorage

3. **Tab Management:** ✅
   - Tabs tracked in `useTabsStore()` with localStorage persistence
   - Tab dropdown already implemented with full functionality

4. **Editor Integration:** ✅
   - Editors: `MilkdownEditor.vue`, `CodeMirrorEditor.vue`
   - Formatting via editor refs and exposed methods
   - Focus on Milkdown actions, minimal CodeMirror actions

5. **Omni Search:** ✅
   - `OmniSearch.vue` component already implemented
   - Opens as modal, searches files and content
   - Ctrl+P shortcut already handled

6. **Breaking Changes:** ✅
   - Preserve all existing functionality
   - Internal refactoring, minimal external impact
   - Existing tests provide safety net

---

## Estimated Timeline

- Phase 1: 1-2 hours (Setup & structure - leveraging existing patterns)
- Phase 2: 2-3 hours (Top row implementation - reusing existing components)
- Phase 3: 2-3 hours (Actions row implementation - editor integration)
- Phase 4: 2-3 hours (Integration - careful refactoring of NoteViewer)
- Phase 5: 1-2 hours (Styling & polish - using existing CSS variables)
- Phase 6: 2-3 hours (Testing & docs - updating existing tests)

**Total:** ~10-16 hours

**Timeline Notes:** Reduced from original estimate due to:
- Extensive existing functionality to reuse
- Well-established patterns and CSS variables
- Existing state management and component structure
- Comprehensive test suite already in place

---

## End of Specification

**Specification Status:** ✅ Customized for KBase codebase
- All architecture assumptions verified against actual implementation
- Component locations and patterns documented
- State management integration specified
- Existing functionality preservation emphasized

Last Updated: 2025-11-29
Version: 1.0 (KBase Customized)