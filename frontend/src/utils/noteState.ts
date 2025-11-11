import type { editor as MonacoEditorNamespace } from 'monaco-editor'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface MonacoEditorState {
  viewState?: MonacoEditorNamespace.ICodeEditorViewState
}

export interface MilkdownSelectionState {
  from: number
  to: number
}

export interface MilkdownScrollState {
  top: number
}

export interface NoteEditorState {
  monaco?: MonacoEditorState
  milkdown?: {
    selection?: MilkdownSelectionState
    scroll?: MilkdownScrollState
  }
}

const NOTE_STATE_KEY_PREFIX = 'kbase_note_state:'

const getStorage = (): StorageLike | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage as StorageLike
  }

  return null
}

const buildKey = (path: string): string => {
  return `${NOTE_STATE_KEY_PREFIX}${encodeURIComponent(path)}`
}

export const loadNoteState = (path: string): NoteEditorState | null => {
  const storage = getStorage()
  if (!storage || !path) return null

  try {
    const raw = storage.getItem(buildKey(path))
    if (!raw) return null
    const parsed = JSON.parse(raw) as NoteEditorState
    return parsed ?? null
  } catch (error) {
    console.warn('[noteState] Failed to parse stored state', error)
    return null
  }
}

export const saveNoteState = (path: string, state: NoteEditorState): void => {
  const storage = getStorage()
  if (!storage || !path) return

  try {
    storage.setItem(buildKey(path), JSON.stringify(state))
  } catch (error) {
    console.warn('[noteState] Failed to save state', error)
  }
}

export const updateNoteStateSegment = <K extends keyof NoteEditorState>(
  path: string,
  segment: K,
  segmentState: Partial<NonNullable<NoteEditorState[K]>>
): void => {
  const storage = getStorage()
  if (!storage || !path) return

  const current = loadNoteState(path) ?? {}
  const existingSegment = (current[segment] ?? {}) as Record<string, unknown>
  const updatedSegment = {
    ...existingSegment,
    ...segmentState
  }

  const nextState: NoteEditorState = {
    ...current,
    [segment]: updatedSegment
  }

  saveNoteState(path, nextState)
}

export const clearNoteState = (path: string): void => {
  const storage = getStorage()
  if (!storage || !path) return

  storage.removeItem(buildKey(path))
}

