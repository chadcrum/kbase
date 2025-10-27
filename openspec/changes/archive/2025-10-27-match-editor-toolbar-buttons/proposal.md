## Why

The editor toolbar (ViewerToolbar) currently has inconsistent button styling compared to the file explorer toolbar (FileExplorerToolbar). The primary action buttons (Search, Theme, Logout) display text labels and use larger padding, creating visual inconsistency across the application interface.

## What Changes

- Remove text labels from Search and Logout buttons, keeping them icon-only
- Standardize button sizing and padding to match FileExplorerToolbar style
- Update theme toggle button to match compact dimensions
- Ensure tooltips provide context for icon-only buttons
- Update tests to verify icon-only button rendering and functionality

## Impact

- Affected specs: UI component styling capability (to be created)
- Affected code: 
  - `frontend/src/components/viewer/ViewerToolbar.vue`
  - `frontend/src/components/viewer/ViewerToolbar.test.ts`
