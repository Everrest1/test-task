import type { StorageLike } from '~/shared/utils/storage'

export interface MemoryStorage extends StorageLike {
  entries: Map<string, string>
}

export function createMemoryStorage(): MemoryStorage {
  const entries = new Map<string, string>()
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}