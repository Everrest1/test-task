export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const SCHEMA_VERSION = 1
export const NOTES_STORAGE_KEY = 'notes.app.notes.v1'
export const DRAFTS_STORAGE_KEY = 'notes.app.drafts.v1'

export interface Persisted<T> {
  version: number
  payload: T
}

function memoryStorage(): StorageLike {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  }
}

let storageOverride: StorageLike | null = null

export function setStorageOverride(storage: StorageLike | null): void {
  storageOverride = storage
}

export function createStorage(): StorageLike {
  if (storageOverride) return storageOverride
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage as StorageLike
  }
  return memoryStorage()
}

export function encode<T>(payload: T): string {
  return JSON.stringify({ version: SCHEMA_VERSION, payload } satisfies Persisted<T>)
}

export function decode<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Persisted<T> | null
    if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number') return null
    if (parsed.version !== SCHEMA_VERSION) return null
    return parsed.payload ?? null
  } catch {
    return null
  }
}