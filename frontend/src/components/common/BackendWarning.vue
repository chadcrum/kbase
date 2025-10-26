<template>
  <div v-if="shouldShowWarning" class="backend-warning">
    <div class="warning-content">
      <div class="warning-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="warning-message">
        <strong>Cannot connect to backend server</strong>
        <span class="warning-detail">Please check your connection and try again.</span>
      </div>
      <div class="warning-actions">
        <button 
          @click="handleRetry" 
          :disabled="isChecking"
          class="retry-button"
        >
          <span v-if="isChecking" class="loading-spinner"></span>
          {{ isChecking ? 'Checking...' : 'Retry' }}
        </button>
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
import { useBackendHealth } from '@/composables/useBackendHealth'

const { shouldShowWarning, isChecking, retryConnection, dismissWarning } = useBackendHealth()

const handleRetry = async () => {
  await retryConnection()
}

const handleDismiss = () => {
  dismissWarning()
}
</script>

<style scoped>
.backend-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-bottom: 1px solid #d97706;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.warning-icon {
  flex-shrink: 0;
  color: #92400e;
}

.warning-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.warning-message strong {
  color: #92400e;
  font-weight: 600;
  font-size: 0.875rem;
}

.warning-detail {
  color: #92400e;
  font-size: 0.75rem;
  opacity: 0.9;
}

.warning-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.375rem;
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
}

.retry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dismiss-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dismiss-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive design */
@media (max-width: 640px) {
  .warning-content {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .warning-message {
    min-width: 0;
  }
  
  .warning-message strong {
    font-size: 0.8125rem;
  }
  
  .warning-detail {
    font-size: 0.6875rem;
  }
  
  .retry-button {
    padding: 0.375rem 0.5rem;
    font-size: 0.6875rem;
  }
  
  .dismiss-button {
    width: 1.75rem;
    height: 1.75rem;
  }
}
</style>
