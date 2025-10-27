<template>
  <div v-if="showUpdatePrompt" class="update-prompt">
    <div class="update-prompt-content">
      <div class="update-prompt-icon">🔄</div>
      <div class="update-prompt-text">
        <h3>Update Available</h3>
        <p>A new version of KBase is available</p>
      </div>
      <div class="update-prompt-actions">
        <button @click="handleUpdate" class="btn-update">Update</button>
        <button @click="skipUpdate" class="btn-skip">Later</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePWA } from '@/composables/usePWA'

const {
  showUpdatePrompt,
  handleUpdate,
  skipUpdate
} = usePWA()
</script>

<style scoped>
.update-prompt {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  max-width: 400px;
  width: calc(100% - 40px);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.update-prompt-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px var(--shadow);
}

.update-prompt-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.update-prompt-text {
  flex: 1;
  min-width: 0;
}

.update-prompt-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.update-prompt-text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.update-prompt-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-update {
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 36px;
}

.btn-update:hover {
  background-color: #5568d3;
}

.btn-skip {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 36px;
}

.btn-skip:hover {
  background-color: var(--bg-tertiary);
}

@media (max-width: 640px) {
  .update-prompt {
    top: 10px;
    width: calc(100% - 20px);
  }

  .update-prompt-content {
    flex-wrap: wrap;
  }

  .update-prompt-actions {
    width: 100%;
    gap: 8px;
  }

  .btn-update,
  .btn-skip {
    flex: 1;
  }
}
</style>

