import { defineStore } from 'pinia'
import type { Note } from './model'
import { createStorage, decode, encode, DRAFTS_STORAGE_KEY } from '~/shared/lib/storage'

export interface DraftRecord {
  note: Note
  savedAt: number
}

export const useDraftsStore = defineStore('drafts', () => {
  const storage = createStorage()

  function readAll(): Record<string, DraftRecord> {
    const payload = decode<Record<string, DraftRecord>>(storage.getItem(DRAFTS_STORAGE_KEY))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
    return payload
  }

  function getDraft(id: string): DraftRecord | null {
    return readAll()[id] ?? null
  }

  function saveDraft(id: string, record: DraftRecord): void {
    const all = readAll()
    all[id] = record
    storage.setItem(DRAFTS_STORAGE_KEY, encode(all))
  }

  function removeDraft(id: string): void {
    const all = readAll()
    if (!(id in all)) return
    delete all[id]
    storage.setItem(DRAFTS_STORAGE_KEY, encode(all))
  }

  return { getDraft, saveDraft, removeDraft }
})