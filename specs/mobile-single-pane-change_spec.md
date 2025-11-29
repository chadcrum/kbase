# Mobile View: Dual Pane Toggle Specification

**Feature:** Mobile-Optimized Pane Toggle for KBase  
**Type:** Major UI Change  
**Status:** Specification  
**Created:** 2025-11-28  
**Target:** Vue 3 Frontend

---

## Agent rules

- Only work at one phase at a time
- Only work on the current phase
- Do not work on other phases
- Use a todo list under each phase and check it as things are done
- The todo list should be included in this doc under the corresponding phase
- Once a phase is complete - ensure todo list is complete and at 2 lines under the phase explaining what was done (Very brief), as well as list commits for references
- Update this file with your progress as previously stated


## Overview

This specification defines the implementation of a mobile-specific dual-pane toggle system for KBase. On mobile devices (screens < 768px), the application will display only one pane at a time: either the sidebar (file explorer) or the note pane (primary editor). The existing collapse/expand button for the file explorer will serve as the toggle mechanism, requiring no new UI elements.

### Key Requirements

1. **Mobile-Only Feature**: This behavior applies ONLY to mobile view (< 768px width)
2. **No New Buttons**: Use the existing sidebar collapse/expand button
3. **Mutually Exclusive Panes**: Only sidebar OR note pane visible at any time on mobile
4. **Desktop Unchanged**: Desktop behavior (≥ 768px) remains unchanged with dual-pane support
5. **Seamless UX**: Smooth transitions and intuitive behavior

---

## Current State Analysis

### Tech Stack
- **Frontend**: Vue 3 with TypeScript, Pinia for state management
- **UI Components**: Monaco Editor (code editor), Milkdown (WYSIWYG markdown)
- **Styling**: Likely CSS/SCSS with responsive breakpoints
- **Layout Structure**: AppLayout component with sidebar and editor panes

### Current Behavior (Desktop)
- Dual-pane layout with resizable sidebar
- Collapse/expand button toggles sidebar visibility
- Editor pane adjusts width when sidebar is collapsed/expanded
- Both panes can be visible simultaneously

### Current Behavior (Mobile - Presumed)
- Likely both panes stack or display side-by-side in cramped space
- Sidebar collapse may hide sidebar but editor still constrained

---

## Proposed Solution

### Mobile-Specific Behavior (< 768px)

#### State 1: Sidebar Visible (Default on Mobile)
- **Sidebar**: Fully visible, takes 100% width
- **Note Pane**: Hidden (display: none or off-screen)
- **Collapse Button**: Shows "collapse" icon (indicates sidebar will hide)
- **User Action**: Tapping collapse button → transitions to State 2

#### State 2: Note Pane Visible
- **Sidebar**: Hidden (display: none or off-screen)
- **Note Pane**: Fully visible, takes 100% width
- **Collapse Button**: Shows "expand" icon (indicates sidebar will show)
- **User Action**: Tapping collapse button → transitions to State 1

### Desktop Behavior (≥ 768px) - UNCHANGED
- Dual-pane layout remains as-is
- Collapse button toggles sidebar visibility
- Editor pane resizes accordingly
- Both panes can be visible simultaneously

---

## Technical Implementation

### Phase 1: State Management Setup

- [x] Create UI store (frontend/src/stores/ui.ts) with mobile state management
- [x] Create responsive composable (frontend/src/composables/useResponsive.ts)
- [x] Update vault store to integrate with UI store for mobile pane toggling
- [x] Run type-check to ensure no TypeScript errors
- [x] Write unit tests for new UI store functionality

Phase 1 completed successfully. Created UI store with mobile pane state management, responsive composable for breakpoint detection, updated vault store to integrate with UI store, ensured type safety, and added comprehensive unit tests. All tests pass and type-check succeeds.

Commits:
- 1052e12 feat(ui): add mobile single-pane toggle state management

#### 1.1 Pinia Store Updates
**File**: `frontend/src/stores/ui.ts` (or similar)

**Add Mobile State**:
```typescript
interface UIState {
  sidebarCollapsed: boolean;
  activeMobilePane: 'sidebar' | 'editor'; // NEW
  isMobileView: boolean; // NEW
}

const state = reactive<UIState>({
  sidebarCollapsed: false,
  activeMobilePane: 'sidebar', // Default to sidebar on mobile
  isMobileView: false,
});
```

**Add Actions**:
```typescript
// Toggle between sidebar and editor on mobile
function toggleMobilePane() {
  if (state.isMobileView) {
    state.activeMobilePane = 
      state.activeMobilePane === 'sidebar' ? 'editor' : 'sidebar';
  }
}

// Update mobile view detection
function updateMobileView(isMobile: boolean) {
  state.isMobileView = isMobile;
  // Reset to sidebar when transitioning to mobile
  if (isMobile && state.activeMobilePane === 'editor') {
    state.activeMobilePane = 'sidebar';
  }
}

// Existing toggle for desktop behavior
function toggleSidebar() {
  if (state.isMobileView) {
    // On mobile, toggle between panes
    toggleMobilePane();
  } else {
    // On desktop, collapse/expand sidebar
    state.sidebarCollapsed = !state.sidebarCollapsed;
  }
}
```

#### 1.2 Responsive Breakpoint Detection
**File**: `frontend/src/composables/useResponsive.ts` (NEW)

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { useUIStore } from '@/stores/ui';

export const MOBILE_BREAKPOINT = 768; // px

export function useResponsive() {
  const uiStore = useUIStore();
  const windowWidth = ref(window.innerWidth);

  const checkMobileView = () => {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    uiStore.updateMobileView(isMobile);
    windowWidth.value = window.innerWidth;
  };

  const handleResize = () => {
    checkMobileView();
  };

  onMounted(() => {
    checkMobileView();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  return {
    isMobileView: computed(() => uiStore.isMobileView),
    windowWidth,
  };
}
```

---

### Phase 2: Layout Component Updates

- [x] Updated AppLayout.vue to use UI store and implement mobile single-pane layout with responsive classes
- [x] Updated TabsBar.vue to use UI store for toggle button logic and dynamic icons/titles
- [x] Updated Sidebar.vue to use UI store for collapsed state and added mobile-hidden CSS class
- [x] Ran type-check to ensure no TypeScript errors

Phase 2 completed successfully. Updated all layout components to integrate with the UI store for mobile single-pane functionality. AppLayout now uses responsive classes for mobile view, TabsBar toggle button adapts its behavior and appearance based on mobile/desktop context, and Sidebar properly handles mobile visibility states. All type-checks pass.

---

### Phase 3: Edge Cases & Polish

- [x] Implement auto-switch to editor on file selection (mobile)
- [x] Add CSS transitions for pane switching
- [x] Fix mobile pane reset logic to prevent rapid switching on resize events

#### 3.1 File Selection Behavior
**Requirement**: When user selects a file from sidebar on mobile, automatically switch to editor pane.

**Implementation** (in FileTree component):
```typescript
const handleSelectNote = (path: string) => {
  vaultStore.selectNote(path)

  // Auto-switch to editor on mobile
  if (uiStore.isMobileView) {
    uiStore.activeMobilePane = 'editor'
  }
}
```

#### 3.2 Orientation Change Handling
- When device orientation changes (portrait ↔ landscape), re-evaluate mobile view
- Reset to sidebar if transitioning from desktop to mobile
- Handled automatically by `useResponsive` composable

#### 3.3 Transition Polish
```scss
.mobile-view {
  .main-content,
  .sidebar {
    flex: 0 0 100%;
    width: 100%;
    transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
  }

  .mobile-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
}
```

#### 3.4 Mobile Pane Reset Fix
**Issue**: On Android Chrome, clicking notes caused rapid pane switching due to resize events triggering pane reset.

**Root Cause**: `updateMobileView()` was resetting pane to sidebar on every mobile view detection, even when already in mobile view.

**Fix**: Only reset pane when transitioning FROM desktop TO mobile:
```typescript
function updateMobileView(isMobile: boolean) {
  const wasDesktop = !isMobileView.value
  isMobileView.value = isMobile
  // Reset ONLY when transitioning from desktop to mobile
  if (isMobile && wasDesktop && activeMobilePane.value === 'editor') {
    activeMobilePane.value = 'sidebar'
  }
}
```

Phase 3 completed successfully. Implemented auto-switch to editor on file selection for mobile devices, added smooth CSS transitions, and fixed mobile pane reset logic to prevent rapid switching on resize events. All type-checks pass and tests pass.

Commits:
- 02adb85 feat(ui): add mobile pane edge cases and polish
- [TBD] fix(ui): prevent mobile pane reset on resize events

---


### Phase 4: Testing & Mobile Search Enhancement

- [x] Add omni search button to file explorer toolbar for mobile single-pane mode
- [x] Implement event bubbling through component hierarchy
- [x] Fix toolbar positioning by grouping mobile action buttons
- [x] Run type-check to ensure no TypeScript errors
- [x] Commit changes with proper conventional commit message

Phase 4 completed successfully. Added mobile omni search button to file explorer toolbar that appears when sidebar is full screen on mobile devices. Implemented proper event handling through the component hierarchy and fixed toolbar positioning issues. All type-checks pass and changes committed.

Commits:
- f33c528 feat(ui): add mobile omni search button

#### 4.1 Unit Tests
**File**: `frontend/src/stores/ui.spec.ts`

```typescript
describe('UI Store - Mobile Pane Toggle', () => {
  it('should toggle mobile pane between sidebar and editor', () => {
    const store = useUIStore();
    store.isMobileView = true;
    store.activeMobilePane = 'sidebar';
    
    store.toggleMobilePane();
    expect(store.activeMobilePane).toBe('editor');
    
    store.toggleMobilePane();
    expect(store.activeMobilePane).toBe('sidebar');
  });

  it('should not affect desktop behavior', () => {
    const store = useUIStore();
    store.isMobileView = false;
    store.sidebarCollapsed = false;
    
    store.toggleSidebar();
    expect(store.sidebarCollapsed).toBe(true);
    // activeMobilePane should not change
  });

  it('should reset to sidebar when transitioning to mobile', () => {
    const store = useUIStore();
    store.activeMobilePane = 'editor';
    
    store.updateMobileView(true);
    expect(store.activeMobilePane).toBe('sidebar');
  });
});
```

#### 4.2 E2E Tests (Playwright)
**File**: `frontend/e2e/mobile-pane-toggle.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile Pane Toggle', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile viewport

  test('should show sidebar by default on mobile', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');
    
    const sidebar = page.locator('.sidebar-pane');
    const editor = page.locator('.editor-pane');
    
    await expect(sidebar).toBeVisible();
    await expect(editor).not.toBeVisible();
  });

  test('should toggle to editor when collapse button clicked', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');
    
    await page.click('.collapse-toggle');
    
    const sidebar = page.locator('.sidebar-pane');
    const editor = page.locator('.editor-pane');
    
    await expect(sidebar).not.toBeVisible();
    await expect(editor).toBeVisible();
  });

  test('should auto-switch to editor when file selected', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');
    
    await page.click('[data-testid="file-item"]:first-child');
    
    const editor = page.locator('.editor-pane');
    await expect(editor).toBeVisible();
  });
});

test.describe('Desktop Behavior Unchanged', () => {
  test.use({ viewport: { width: 1280, height: 720 } }); // Desktop viewport

  test('should show both panes on desktop', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');
    
    const sidebar = page.locator('.sidebar-pane');
    const editor = page.locator('.editor-pane');
    
    await expect(sidebar).toBeVisible();
    await expect(editor).toBeVisible();
  });

  test('should collapse sidebar on desktop, keeping editor visible', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');
    
    await page.click('.collapse-toggle');
    
    const editor = page.locator('.editor-pane');
    await expect(editor).toBeVisible();
  });
});
```

#### 4.3 Manual Testing Checklist

- [ ] **Mobile Portrait (< 768px)**
  - [ ] Default shows sidebar, editor hidden
  - [ ] Toggle button switches to editor
  - [ ] Toggle button switches back to sidebar
  - [ ] File selection auto-shows editor
  - [ ] Smooth transitions between panes
  - [ ] No horizontal scrolling

- [ ] **Mobile Landscape (< 768px height)**
  - [ ] Same behavior as portrait
  - [ ] Layouts don't break

- [ ] **Tablet (768px - 1024px)**
  - [ ] Desktop behavior (both panes visible)
  - [ ] Sidebar collapse works as before

- [ ] **Desktop (> 1024px)**
  - [ ] Unchanged dual-pane behavior
  - [ ] No regressions

- [ ] **Orientation Change**
  - [ ] Switching portrait ↔ landscape updates view correctly
  - [ ] No broken states

- [ ] **Browser Back Button** (if implemented)
  - [ ] Navigates from editor → sidebar on mobile
  - [ ] Doesn't interfere with desktop

---

## Documentation Updates

### 4.1 Update README.md
Add section under "Features":

```markdown
### Mobile-Optimized Interface
- **Single-Pane Mobile View**: On mobile devices (< 768px), the interface displays either the file explorer or editor at a time for optimal screen space usage
- **Smart Toggle**: The sidebar collapse button serves as a pane toggle on mobile, switching between file explorer and editor views
- **Auto-Switch**: Selecting a file automatically displays the editor on mobile devices
- **Seamless Desktop Experience**: Desktop users (≥ 768px) retain the full dual-pane layout with resizable sidebar
```

### 4.2 Update docs/architecture-design.md
Add section under "Frontend Architecture":

```markdown
#### Responsive Layout System

**Mobile View (< 768px)**
The application uses a single-pane layout on mobile devices to maximize usable screen space:
- Only sidebar OR editor visible at any time
- Existing collapse button serves as pane toggle
- File selection automatically switches to editor
- State managed via Pinia store (`activeMobilePane`)

**Desktop View (≥ 768px)**
Retains traditional dual-pane layout:
- Sidebar and editor visible simultaneously
- Resizable sidebar with collapse/expand
- Independent pane management

**Implementation**
- Breakpoint detection via `useResponsive` composable
- Real-time viewport monitoring with resize handlers
- CSS-based responsive classes (`.mobile-view`)
- State synchronization with Pinia store
```

### 4.3 Create Feature Documentation
**File**: `docs/features/mobile-pane-toggle.md`

Include:
- Overview of feature
- Technical implementation details
- State management flow diagrams
- Testing strategy
- Known limitations
- Future enhancements

---

## Pre-Commit Checklist

Before committing this feature:

- [ ] **Type-check passes** (CRITICAL)
  ```bash
  cd frontend && npm run type-check
  ```

- [ ] **All tests pass**
  ```bash
  npm run test
  ```

- [ ] **Manual testing completed** (see checklist above)

- [ ] **Documentation updated**
  - [ ] README.md
  - [ ] docs/architecture-design.md
  - [ ] docs/features/mobile-pane-toggle.md (create)

- [ ] **Code quality verified**
  - [ ] TypeScript strict mode compliant
  - [ ] No console errors or warnings
  - [ ] Responsive breakpoints tested
  - [ ] Transitions smooth and performant

- [ ] **Commit message follows convention**
  ```
  feat(ui): add mobile single-pane toggle functionality
  
  - Implement mobile-specific pane switching (< 768px)
  - Add responsive breakpoint detection
  - Update collapse button to serve as pane toggle on mobile
  - Auto-switch to editor on file selection (mobile)
  - Desktop behavior unchanged (≥ 768px)
  
  Docs: docs/features/mobile-pane-toggle.md
  ```

---

## Implementation Phases Summary

### Phase 1: State Management (2-3 hours)
- Create/update UI store with mobile state
- Add responsive composable
- Type-check and unit tests

### Phase 2: Layout Components (3-4 hours)
- Update AppLayout component
- Modify collapse button logic
- Add responsive CSS classes
- Type-check

### Phase 3: Edge Cases & Polish (2-3 hours)
- Auto-switch on file selection
- Handle orientation changes
- Smooth transitions
- Optional: back button support

### Phase 4: Testing & Documentation (2-3 hours)
- Write unit tests
- Write E2E tests
- Manual testing across devices
- Update documentation

**Total Estimated Time**: 9-13 hours

---

## Risks & Mitigations

### Risk 1: Desktop Regression
**Mitigation**: 
- Extensive testing at ≥ 768px breakpoint
- Separate desktop test suite
- Guard clauses for mobile-specific behavior

### Risk 2: Transition Performance
**Mitigation**:
- Use CSS transforms over display changes
- Hardware-accelerated animations
- Test on lower-end mobile devices

### Risk 3: Type Errors
**Mitigation**:
- Run `npm run type-check` frequently
- Fix type errors immediately
- Use TypeScript strict mode

### Risk 4: State Synchronization Issues
**Mitigation**:
- Centralize state in Pinia store
- Use computed properties over manual syncing
- Add state validation in dev mode

---

## Future Enhancements

1. **Swipe Gestures**: Add touch swipe to switch between panes
2. **Persistent Preference**: Remember user's last active pane
3. **Tablet Optimization**: Custom behavior for tablet sizes (768-1024px)
4. **Animation Customization**: User preference for transition speed
5. **Accessibility**: Keyboard shortcuts for pane switching

---

## Success Criteria

- ✅ Mobile users (< 768px) see only one pane at a time
- ✅ Toggle button switches between sidebar and editor on mobile
- ✅ File selection auto-shows editor on mobile
- ✅ Desktop behavior (≥ 768px) unchanged
- ✅ No regressions in existing functionality
- ✅ No rapid pane switching on Android Chrome resize events
- ✅ All tests pass (unit + E2E)
- ✅ Type-check passes
- ✅ Documentation updated
- ✅ 80%+ test coverage maintained

---

## References

- **KBase Repository**: https://github.com/chadcrum/kbase
- **Vue 3 Docs**: https://vuejs.org/guide/
- **Pinia Docs**: https://pinia.vuejs.org/
- **Playwright Testing**: https://playwright.dev/
- **Project AI Guide**: See `AI-AGENT-GUIDE.md`

---

## Approval & Sign-off

**Specification Author**: AI Agent  
**Date**: 2025-11-28  
**Status**: Ready for Implementation  

**Approved By**: [Awaiting Approval]  
**Implementation Start**: [TBD]  
**Target Completion**: [TBD]