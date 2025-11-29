# Milkdown Checkbox Indentation Fix - Updated Spec

**Version:** 2.0  
**Project:** chadcrum/kbase  
**Goal:** Fix nested task list indentation behavior in Milkdown (Tab/Shift+Tab should behave like standard bullet list indentation)

## Target Files
- `frontend/src/components/Editor.vue`
- `frontend/src/components/MilkdownEditor.vue`
- `frontend/src/composables/useMilkdown.ts`
- `frontend/src/styles/editor.css`

## Dependencies

Ensure the following packages are installed:

```bash
npm install @milkdown/preset-gfm@^7.5.0
npm install @milkdown/plugin-indent@^7.5.0
npm install @milkdown/theme-nord@^7.5.0
npm install @milkdown/plugin-history@^7.5.0
```

## Implementation Steps

### 1. Configure Editor with Correct Plugin Order

**Critical:** Load GFM preset before the indent plugin so that indent recognizes task list items.

```typescript
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { nord } from '@milkdown/theme-nord'
import { gfm } from '@milkdown/preset-gfm'
import { indent } from '@milkdown/plugin-indent'
import { history } from '@milkdown/plugin-history'

const editor = Editor
  .make()
  .config(ctx => {
    ctx.set(rootCtx, root)
    ctx.set(defaultValueCtx, noteContent.value)
  })
  .use(nord)
  .use(gfm)        // Must load BEFORE indent
  .use(indent)     // Loads after GFM to recognize task items
  .use(history)
  .create()
```

### 2. Test Default Indent Behavior First

**Before adding configuration**, test if Tab/Shift+Tab already work with task lists. The indent plugin may handle task lists automatically once plugin order is correct.

Test by:
1. Creating a task list: `- [ ] Task item`
2. Pressing Tab to indent
3. Pressing Shift+Tab to outdent

If this works, **skip to Step 4 (CSS)**. If not, proceed to Step 3.

### 3. Configure Indent Plugin (If Needed)

**Note:** Based on Milkdown v7 examples, the indent plugin typically doesn't require explicit configuration. However, if you need to customize behavior:

```typescript
// Basic usage - try this first
.use(indent)

// If you need custom configuration, you may need to access
// internal configuration keys. Check the actual plugin API
// or inspect the indent plugin's source for available options.
```

**Warning:** The original spec's `.configure()` syntax appears incorrect for v7. Milkdown v7 uses composable plugins, not the factory pattern. Configuration is typically done via context, not method chaining.

### 4. Add CSS for Checkbox Alignment

Add these styles to `frontend/src/styles/editor.css`:

```css
/* Remove default list styling from task list items */
.milkdown .task-list-item {
  list-style: none;
  position: relative;
  padding-left: 0 !important;
}

/* Position checkbox absolutely to prevent layout shift */
.milkdown .task-list-item input[type="checkbox"] {
  position: absolute;
  left: 0;
  top: 0.35em;
  margin: 0;
  cursor: pointer;
}

/* Offset label text to make room for checkbox */
.milkdown .task-list-item label {
  display: block;
  margin-left: 1.8em;
  min-height: 1.5em;
}

/* Indent nested task lists consistently */
.milkdown ul.contains-task-list,
.milkdown ul ul.contains-task-list {
  padding-left: 2em;  /* Adjust this value to match your desired indent */
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

/* Ensure task list container has proper spacing */
.milkdown .contains-task-list {
  list-style: none;
}

/* Prevent checkbox from jumping lines on indent/outdent */
.milkdown .task-list-item > * {
  vertical-align: top;
}
```

### 5. Alternative: Custom Keymap (Only If Default Doesn't Work)

If Tab/Shift+Tab don't work automatically, you may need custom keybindings. **This is unlikely to be necessary** with correct plugin order.

```typescript
// This approach is speculative - verify with actual Milkdown v7 docs
import { Slice } from '@milkdown/prose/model'
import { commandsCtx } from '@milkdown/core'

// You would need to create custom commands for task list indentation
// The exact implementation depends on your Milkdown version's API
```

### 6. Handle Known GFM Preset Issues

There's a known bug in v7.3.5 where checkboxes don't render correctly. Solutions:

1. **Update to latest version** (v7.5.0+) which may have fixes
2. **Add fallback rendering** if checkboxes don't appear:

```typescript
// In your editor config
.config(ctx => {
  // Ensure GFM task lists are enabled
  ctx.set(rootCtx, root)
  ctx.set(defaultValueCtx, noteContent.value)
})
```

## Verification Checklist

Test the following after implementation:

- [ ] Tab indents nested checkboxes by 2 spaces
- [ ] Shift+Tab outdents correctly
- [ ] Checkbox items never jump to previous line on indent/outdent
- [ ] Checkboxes are clickable and maintain alignment
- [ ] Markdown output uses consistent indentation (2 spaces)
- [ ] Standard bullet lists remain unaffected
- [ ] Undo/redo restores nesting properly
- [ ] Saving to `.md` exports correct structure
- [ ] Multiple levels of nesting work correctly
- [ ] Mixed lists (bullets + tasks) maintain proper spacing

## Success Criteria

- Task list indentation behaves like standard bullet lists
- No visual jumping or layout shifts when indenting
- No excessive horizontal shifting
- Markdown output remains clean and consistent
- Checkboxes maintain proper alignment at all indent levels

## Troubleshooting

### Issue: Tab doesn't indent task lists
**Solution:** Verify plugin order. GFM must load before indent.

### Issue: Checkboxes don't render
**Solution:** Update to @milkdown/preset-gfm@^7.5.0 or later.

### Issue: Checkbox position shifts when indenting
**Solution:** Apply the CSS from Step 4, especially the absolute positioning rules.

### Issue: Indent depth is inconsistent
**Solution:** Adjust `padding-left` value in `.contains-task-list` CSS rule.

## Notes

- **Root Cause:** The indent plugin must be loaded after GFM so it recognizes `taskItem` nodes. Plugin order + CSS typically resolves most issues.
- **Milkdown v7 Changes:** Factory plugins were replaced with composable plugins. The original spec's `.configure()` syntax is from the older v6 API.
- **Testing:** Always test with the latest package versions, as checkbox rendering bugs have been reported and potentially fixed.
- **CSS is Critical:** Even with correct plugin order, CSS is needed to prevent visual layout issues during indent/outdent operations.

## Key Differences from Original Spec

1. **Removed incorrect `.configure()` syntax** - not valid for Milkdown v7's composable plugin architecture
2. **Removed speculative keymap configuration** - likely unnecessary with proper plugin order
3. **Added troubleshooting section** based on known issues
4. **Added step to test default behavior** before applying complex configurations
5. **Updated to latest package versions** (7.5.0)
6. **Enhanced CSS** with additional rules for edge cases
7. **Added note about known v7.3.5 bug** with checkbox rendering