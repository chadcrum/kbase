<template>
  <div id="app">
    <RouterView />
    <InstallPrompt />
    <UpdatePrompt />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import InstallPrompt from '@/components/common/InstallPrompt.vue'
import UpdatePrompt from '@/components/common/UpdatePrompt.vue'

// Initialize stores
const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // Initialize theme first (sync operation)
  themeStore.initializeTheme()
  
  // Then initialize authentication
  await authStore.initializeAuth()
})
</script>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

/* CSS Variables for Light Mode */
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --border-color: #e2e8f0;
  --border-color-subtle: #e5e7eb;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --shadow: rgba(0, 0, 0, 0.1);
  --code-bg: #f3f4f6;
}

/* CSS Variables for Dark Mode */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --border-color: #334155;
  --border-color-subtle: #475569;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --shadow: rgba(0, 0, 0, 0.3);
  --code-bg: #1e293b;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app {
  height: 100vh;
  overflow: hidden;
}

/* Mobile-first responsive design */
@media (max-width: 768px) {
  body {
    -webkit-tap-highlight-color: transparent;
  }
}

/* Safe area insets for notched devices */
@supports (padding: max(0px)) {
  #app {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}

/* Utility classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus styles */
*:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

button:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>

