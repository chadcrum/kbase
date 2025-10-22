import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock localStorage with actual implementation
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock()
})

// Global test configuration
config.global.stubs = {
  // Add any global component stubs here
}

