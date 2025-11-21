<template>
  <div v-if="shouldShowWarning" class="git-error-warning">
    <div class="warning-content">
      <div class="warning-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="warning-message">
        <strong>Git Version Control Error</strong>
        <span class="warning-detail">{{ gitStatus?.last_error || 'Unknown error' }}</span>
        <span v-if="lastErrorTime" class="warning-time">
          Error occurred: {{ formatTime(lastErrorTime) }}
        </span>
      </div>
      <div class="warning-actions">
        <button @click="handleDismiss" class="dismiss-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGitStatus } from '@/composables/useGitStatus'
import type { GitStatus } from '@/types'

const { shouldShowWarning, gitStatus, lastErrorTime, dismissWarning } = useGitStatus()

const handleDismiss = () => {
  dismissWarning()
}

const formatTime = (date: Date): string => {
  return date.toLocaleString()
}
</script>

<style scoped>
.git-error-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-bottom: 1px solid #b91c1c;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  max-width: 100%;
}

.warning-icon {
  flex-shrink: 0;
  color: white;
  display: flex;
  align-items: center;
}

.warning-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: white;
  min-width: 0;
}

.warning-message strong {
  font-weight: 600;
  font-size: 0.875rem;
}

.warning-detail {
  font-size: 0.8125rem;
  opacity: 0.95;
  word-break: break-word;
}

.warning-time {
  font-size: 0.75rem;
  opacity: 0.85;
}

.warning-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.dismiss-button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.dismiss-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.dismiss-button:focus {
  outline: 2px solid white;
  outline-offset: 2px;
}

/* Adjust position if backend warning is also shown */
.backend-warning ~ .git-error-warning {
  top: 3.5rem;
}
</style>

