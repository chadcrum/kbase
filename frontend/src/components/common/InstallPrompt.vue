<template>
  <div v-if="showInstallPrompt" class="install-prompt">
    <div class="install-prompt-content">
      <div class="install-prompt-icon">📱</div>
      <div class="install-prompt-text">
        <h3>Install KBase</h3>
        <p>Install KBase for a better experience and offline access</p>
      </div>
      <div class="install-prompt-actions">
        <button @click="installApp" class="btn-install">Install</button>
        <button @click="dismissInstallPrompt" class="btn-dismiss">Not now</button>
      </div>
      <button @click="dismissInstallPrompt" class="btn-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePWA } from '@/composables/usePWA'

const {
  showInstallPrompt,
  installApp: install,
  dismissInstallPrompt: dismiss
} = usePWA()

const installApp = async () => {
  await install()
}

const dismissInstallPrompt = () => {
  dismiss()
}
</script>

<style scoped>
.install-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  max-width: 400px;
  width: calc(100% - 40px);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.install-prompt-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px var(--shadow);
  position: relative;
}

.install-prompt-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.install-prompt-text {
  flex: 1;
  min-width: 0;
}

.install-prompt-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.install-prompt-text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.install-prompt-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-install {
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

.btn-install:hover {
  background-color: #5568d3;
}

.btn-dismiss {
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

.btn-dismiss:hover {
  background-color: var(--bg-tertiary);
}

.btn-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.btn-close:hover {
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .install-prompt {
    bottom: 10px;
    width: calc(100% - 20px);
  }

  .install-prompt-content {
    flex-wrap: wrap;
  }

  .install-prompt-actions {
    width: 100%;
    gap: 8px;
  }

  .btn-install,
  .btn-dismiss {
    flex: 1;
  }

  .install-prompt-text p {
    font-size: 12px;
  }
}
</style>

