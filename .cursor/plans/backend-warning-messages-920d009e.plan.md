<!-- 920d009e-ebb6-46ee-9f10-72ac96237966 eb27e93e-f11c-4b9b-bde2-546983c5abc1 -->
# Backend Warning Messages Implementation

## Overview

Implement a backend connectivity warning system that displays a banner at the top of both the login screen and the main editor when the backend is not functioning.

## Implementation Steps

### 1. Create Backend Health Check System

Create a new composable `/home/chid/git/kbase/frontend/src/composables/useBackendHealth.ts`:

- Add a health check function that pings the backend (e.g., `/api/v1/auth/verify` or a dedicated health endpoint)
- Track backend status (online/offline)
- Track last dismissed timestamp to prevent immediate re-showing
- Provide a manual retry function
- Auto-dismiss warning on successful connection

### 2. Create Reusable Warning Banner Component

Create `/home/chid/git/kbase/frontend/src/components/common/BackendWarning.vue`:

- Display at the top of the page with warning styling (yellow/orange theme)
- Show message: "Cannot connect to backend server"
- Include a retry button
- Include an X button to dismiss (stores dismissal time)
- Auto-hide when backend comes back online
- Reappear on next failed request after dismissal

### 3. Integrate into API Client

Modify `/home/chid/git/kbase/frontend/src/api/client.ts`:

- Add response interceptor to detect network errors (connection refused, timeout, etc.)
- Emit events or update shared state when backend becomes unreachable
- Distinguish between backend down (network error) vs. auth errors (401)

### 4. Add to Login View

Modify `/home/chid/git/kbase/frontend/src/views/LoginView.vue`:

- Import and render `BackendWarning` component at the top
- Trigger health check on mount
- Show warning if backend is unreachable
- Keep existing auth error messages separate from backend warnings

### 5. Add to Main Editor (AppLayout)

Modify `/home/chid/git/kbase/frontend/src/components/layout/AppLayout.vue`:

- Import and render `BackendWarning` component at the top of the layout
- Monitor backend health during normal operation
- Display warning if any API call fails due to backend issues

## Key Design Decisions

- **Immediate Detection**: Check backend health on page load
- **Banner Style**: Fixed position at top, warning colors (amber/orange)
- **Auto-dismiss Logic**: Warning disappears when backend reconnects
- **Reappearance**: After dismissal, warning reappears on next failed API request
- **Separate from Auth Errors**: Backend warnings don't replace login errors
- **Manual Retry**: Users can click retry button to check connection immediately

## Files to Modify

1. **New**: `/home/chid/git/kbase/frontend/src/composables/useBackendHealth.ts`
2. **New**: `/home/chid/git/kbase/frontend/src/components/common/BackendWarning.vue`
3. **Modify**: `/home/chid/git/kbase/frontend/src/api/client.ts`
4. **Modify**: `/home/chid/git/kbase/frontend/src/views/LoginView.vue`
5. **Modify**: `/home/chid/git/kbase/frontend/src/components/layout/AppLayout.vue`

## Testing Considerations

- Test with backend stopped
- Test dismissal and reappearance logic
- Test manual retry button
- Test that auth errors still display correctly
- Test auto-dismiss when backend recovers

### To-dos

- [ ] Create useBackendHealth composable with health check logic
- [ ] Create BackendWarning banner component with retry and dismiss
- [ ] Add network error detection to API client interceptors
- [ ] Add BackendWarning to LoginView
- [ ] Add BackendWarning to AppLayout for editor
- [ ] Update architecture documentation with backend health monitoring