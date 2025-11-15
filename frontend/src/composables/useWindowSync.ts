import { onMounted, onBeforeUnmount } from 'vue'
import { useVaultStore } from '@/stores/vault'

const CHANNEL_NAME = 'kbase-note-sync'

interface SyncMessage {
  type: 'note-updated' | 'note-selected' | 'file-tree-updated'
  path?: string
  content?: string
  timestamp: number
  windowId: string
}

// Singleton service for window sync
class WindowSyncService {
  private channel: BroadcastChannel | null = null
  private initialized = false
  private windowId: string

  constructor() {
    // Generate unique window ID
    this.windowId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  initialize() {
    if (this.initialized) return

    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported, window sync disabled')
      return
    }

    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.initialized = true

    // Listen for messages from other windows
    this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data

      // Ignore messages from the same window (prevent loops)
      if (message.windowId === this.windowId) {
        return
      }

      const vaultStore = useVaultStore()

      switch (message.type) {
        case 'note-updated':
          if (message.path && message.content !== undefined) {
            // Update the note content if it's currently selected
            if (vaultStore.selectedNotePath === message.path) {
              const currentNote = vaultStore.selectedNote
              if (currentNote && currentNote.path === message.path) {
                // Create new object to ensure reactivity
                vaultStore.selectedNote = {
                  ...currentNote,
                  content: message.content
                }
              }
            }
          }
          break

        case 'note-selected':
          if (message.path) {
            // Don't reload if already selected (prevent loops)
            if (vaultStore.selectedNotePath !== message.path) {
              // Don't broadcast when receiving a broadcast (prevent broadcast loops)
              vaultStore.selectNote(message.path, false)
            }
          }
          break

        case 'file-tree-updated':
          // Reload file tree when it's updated in another window
          vaultStore.loadFileTree()
          break
      }
    }
  }

  broadcastNoteUpdate(path: string, content: string) {
    // Ensure channel is initialized
    if (!this.initialized) {
      this.initialize()
    }
    if (!this.channel) return

    const message: SyncMessage = {
      type: 'note-updated',
      path,
      content,
      timestamp: Date.now(),
      windowId: this.windowId
    }

    this.channel.postMessage(message)
  }

  broadcastNoteSelection(path: string) {
    if (!this.initialized) {
      this.initialize()
    }
    if (!this.channel) return

    const message: SyncMessage = {
      type: 'note-selected',
      path,
      timestamp: Date.now(),
      windowId: this.windowId
    }

    this.channel.postMessage(message)
  }

  broadcastFileTreeUpdate() {
    if (!this.initialized) {
      this.initialize()
    }
    if (!this.channel) return

    const message: SyncMessage = {
      type: 'file-tree-updated',
      timestamp: Date.now(),
      windowId: this.windowId
    }

    this.channel.postMessage(message)
  }

  cleanup() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
      this.initialized = false
    }
  }
}

// Export singleton instance
export const windowSyncService = new WindowSyncService()

// Vue composable for components
export function useWindowSync() {
  onMounted(() => {
    windowSyncService.initialize()
  })

  onBeforeUnmount(() => {
    // Don't cleanup here - let it persist across component unmounts
    // Only cleanup when app unmounts
  })

  return {
    broadcastNoteUpdate: (path: string, content: string) => {
      windowSyncService.initialize()
      windowSyncService.broadcastNoteUpdate(path, content)
    },
    broadcastNoteSelection: (path: string) => {
      windowSyncService.initialize()
      windowSyncService.broadcastNoteSelection(path)
    },
    broadcastFileTreeUpdate: () => {
      windowSyncService.initialize()
      windowSyncService.broadcastFileTreeUpdate()
    }
  }
}
