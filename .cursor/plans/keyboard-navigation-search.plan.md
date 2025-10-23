# Keyboard Navigation for Omni Search

## Overview
Add keyboard navigation to the omni-search modal allowing users to navigate results with arrow keys and select with Enter.

## Implementation Plan

### 1. Add Selection State
**File**: `frontend/src/components/common/OmniSearch.vue`

Add a `selectedIndex` ref to track the currently selected result:
```typescript
const selectedIndex = ref(0)
```

### 2. Implement Keyboard Handlers
Add event handlers for arrow keys and Enter:

- **ArrowDown**: Move selection down (wrap to first if at end)
- **ArrowUp**: Move selection up (wrap to last if at start)
- **Enter**: Open the currently selected result
- Keep existing **Escape**: Close modal

### 3. Auto-Select First Result
Watch the `results` array and auto-select first item:
- When results change from empty to populated, set `selectedIndex = 0`
- When new search results load, reset `selectedIndex = 0`

### 4. Visual Feedback
Update template to show selected state:
- Add `:class` binding to result items to highlight selected
- Use different background color for selected item
- Ensure selected state is visually distinct from hover state

### 5. Scroll into View
When selection changes via keyboard:
- Use `scrollIntoView()` to keep selected item visible
- Use smooth scrolling with `{ behavior: 'smooth', block: 'nearest' }`

### 6. Update Styling
Add CSS for selected state:
- Selected item gets distinct background (e.g., light blue)
- Selected + hover combines both states
- Smooth transition for selection changes

### 7. Testing
Add tests for keyboard navigation:
- Arrow key navigation moves selection
- Enter key opens selected result
- Selection wraps at boundaries
- Auto-selects first result on load
- Resets selection on new search

### 8. Documentation
Update architecture docs with keyboard navigation feature.

## Technical Details

### Event Handlers
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (results.value.length === 0) return
  
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length
    scrollSelectedIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = selectedIndex.value === 0 
      ? results.value.length - 1 
      : selectedIndex.value - 1
    scrollSelectedIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (results.value[selectedIndex.value]) {
      selectFile(results.value[selectedIndex.value].path)
    }
  }
}
```

### Scroll Helper
```typescript
const scrollSelectedIntoView = () => {
  nextTick(() => {
    const selected = document.querySelector('.result-item.selected')
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
```

### Selected Class Binding
```vue
<div
  :class="['result-item', { selected: index === selectedIndex }]"
  ...
>
```

## User Experience

**Before**: Users must use mouse to click results

**After**: 
- Type search query
- Use ↓/↑ arrows to navigate results
- Press Enter to open selected note
- First result auto-selected for quick access
- Wrapping navigation for fluid experience

