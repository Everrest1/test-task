import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { NOTES_STORAGE_KEY, SCHEMA_VERSION, setStorageOverride } from '~/shared/utils/storage'
import { useNotesStore } from '~/entities/note/notes-store'
import { createMemoryStorage, type MemoryStorage } from '../support/memory-storage'
import { makeNote } from '../support/make-note'

describe('notes store', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = createMemoryStorage()
    setStorageOverride(storage)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    setStorageOverride(null)
    vi.useRealTimers()
  })

  it('loads an empty list when nothing is stored', () => {
    const store = useNotesStore()
    store.ensureLoaded()
    expect(store.notes).toEqual([])
  })

  it('persists debounced with the schema version', () => {
    vi.useFakeTimers()
    const store = useNotesStore()
    store.ensureLoaded()
    store.upsert(makeNote({ title: 'a' }))

    expect(storage.entries.has(NOTES_STORAGE_KEY)).toBe(false)

    vi.advanceTimersByTime(500)
    const raw = storage.entries.get(NOTES_STORAGE_KEY)
    expect(raw).toBeTruthy()

    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.payload).toHaveLength(1)
    expect(parsed.payload[0].title).toBe('a')
  })

  it('ignores data with an unsupported schema version', () => {
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ version: 99, payload: [makeNote()] }))
    const store = useNotesStore()
    store.ensureLoaded()
    expect(store.notes).toEqual([])
  })

  it('survives a reload cycle', () => {
    const store = useNotesStore()
    store.ensureLoaded()
    const note = makeNote({ title: 'камни' })
    store.upsert(note)
    store.flush()

    const reloaded = useNotesStore()
    reloaded.ensureLoaded()
    expect(reloaded.getById(note.id)?.title).toBe('камни')
  })

  it('upsert updates an existing note with the same id', () => {
    const store = useNotesStore()
    store.ensureLoaded()
    const note = makeNote({ title: 'v1' })
    store.upsert(note)
    store.upsert({ ...note, title: 'v2' })
    expect(store.notes).toHaveLength(1)
    expect(store.notes[0].title).toBe('v2')
  })

  it('removes a note', () => {
    const store = useNotesStore()
    store.ensureLoaded()
    const note = makeNote()
    store.upsert(note)
    expect(store.remove(note.id)).toBe(true)
    expect(store.getById(note.id)).toBeUndefined()
    expect(store.remove(note.id)).toBe(false)
  })

  it('reloads when the underlying storage changes externally', () => {
    const store = useNotesStore()
    store.ensureLoaded()
    const note = makeNote({ title: 'external' })
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, payload: [note] }))
    store.reloadFromStorage()
    expect(store.getById(note.id)?.title).toBe('external')
  })
})