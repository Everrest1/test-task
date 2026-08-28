import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DRAFTS_STORAGE_KEY, setStorageOverride } from '~/shared/utils/storage'
import { useDraftsStore } from '~/entities/note/drafts-store'
import { createMemoryStorage, type MemoryStorage } from '../support/memory-storage'
import { makeNote } from '../support/make-note'

describe('drafts store', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = createMemoryStorage()
    setStorageOverride(storage)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    setStorageOverride(null)
  })

  it('stores and reads a draft per note id', () => {
    const drafts = useDraftsStore()
    const note = makeNote({ title: 'draft' })
    drafts.saveDraft('n1', { note, savedAt: 42 })
    drafts.saveDraft('n2', { note: makeNote(), savedAt: 43 })

    expect(drafts.getDraft('n1')?.note.title).toBe('draft')
    expect(drafts.getDraft('n1')?.savedAt).toBe(42)
    expect(drafts.getDraft('nx')).toBeNull()
  })

  it('removes a draft', () => {
    const drafts = useDraftsStore()
    drafts.saveDraft('n1', { note: makeNote(), savedAt: 1 })
    drafts.removeDraft('n1')
    expect(drafts.getDraft('n1')).toBeNull()
    expect(storage.entries.has(DRAFTS_STORAGE_KEY)).toBe(true)
  })

  it('persists drafts with the schema version', () => {
    const drafts = useDraftsStore()
    drafts.saveDraft('n1', { note: makeNote(), savedAt: 5 })

    const parsed = JSON.parse(storage.entries.get(DRAFTS_STORAGE_KEY)!)
    expect(parsed.version).toBe(1)
    expect(parsed.payload.n1.savedAt).toBe(5)

    const reloaded = useDraftsStore()
    expect(reloaded.getDraft('n1')).not.toBeNull()
  })

  it('ignores drafts with an unsupported schema version', () => {
    storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({ version: 99, payload: { n1: { savedAt: 1 } } }))
    const drafts = useDraftsStore()
    expect(drafts.getDraft('n1')).toBeNull()
  })
})