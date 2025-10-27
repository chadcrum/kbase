## ADDED Requirements

### Requirement: Consistent Toolbar Button Styling
Toolbar buttons across the application SHALL use consistent icon-only styling with standardized dimensions and padding.

#### Scenario: ViewerToolbar buttons match FileExplorerToolbar style
- **WHEN** the application renders the editor toolbar
- **THEN** all action buttons (Search, Theme Toggle, Logout) display as icon-only buttons without text labels
- **AND** button dimensions and padding match the FileExplorerToolbar style
- **AND** tooltips provide context when hovering over buttons

#### Scenario: Icon-only buttons maintain functionality
- **WHEN** users interact with icon-only toolbar buttons
- **THEN** all button click handlers execute correctly
- **AND** tooltips display on hover to indicate button purpose
- **AND** accessibility is maintained through proper title attributes
