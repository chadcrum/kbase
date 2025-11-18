import { describe, expect, it, vi } from 'vitest'
import { milkdownImagePlugin } from './milkdownImagePlugin'

// Mock Milkdown dependencies
vi.mock('@milkdown/utils', () => ({
  $node: vi.fn(() => vi.fn()),
  $nodeAttr: vi.fn(() => vi.fn()),
  $nodeSchema: vi.fn(() => vi.fn()),
  $useKeymap: vi.fn(() => vi.fn()),
}))

vi.mock('@milkdown/core', () => ({
  keymap: vi.fn(() => vi.fn()),
}))

vi.mock('@milkdown/preset-gfm', () => ({
  image: vi.fn(),
  imageBlock: vi.fn(),
}))

describe('milkdownImagePlugin', () => {
  it('exports a Milkdown plugin function', () => {
    expect(typeof milkdownImagePlugin).toBe('function')
  })

  it('returns a function when called', () => {
    const result = milkdownImagePlugin({} as any)
    expect(typeof result).toBe('function')
  })
})
