import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from './model'
import { createStorage, decode, encode, NOTES_STORAGE_KEY } from '~/shared/lib/storage'

const PERSIST_DEBOUNCE_MS = 400

export const useNotesStore = defineStore('notes', () => {
  const storage = createStorage()

  const notes = ref<Note[]>([])
  const loaded = ref(false)
  const revision = ref(0)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let listenerAttached = false

  function sortNotes(): void {
    notes.value.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  function loadFromStorage(): void {
    const payload = decode<Note[]>(storage.getItem(NOTES_STORAGE_KEY))
    notes.value = Array.isArray(payload) ? payload : []
    sortNotes()
    revision.value += 1
  }

  function ensureLoaded(): void {
    if (loaded.value) return
    loaded.value = true
    loadFromStorage()
    if (typeof window === 'undefined' || listenerAttached) return
    listenerAttached = true
    window.addEventListener('storage', (event) => {
      if (event.key !== NOTES_STORAGE_KEY) return
      reloadFromStorage()
    })
  }

  function reloadFromStorage(): void {
    loadFromStorage()
  }

  function persistSoon(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      flush()
    }, PERSIST_DEBOUNCE_MS)
  }

  function flush(): void {
    if (!loaded.value) return
    storage.setItem(NOTES_STORAGE_KEY, encode(notes.value))
  }

  function upsert(note: Note): void {
    ensureLoaded()
    const index = notes.value.findIndex((item) => item.id === note.id)
    if (index === -1) notes.value.push(note)
    else notes.value[index] = note
    sortNotes()
    revision.value += 1
    persistSoon()
  }

  function remove(id: string): boolean {
    ensureLoaded()
    const index = notes.value.findIndex((item) => item.id === id)
    if (index === -1) return false
    notes.value.splice(index, 1)
    revision.value += 1
    persistSoon()
    return true
  }

  function getById(id: string): Note | undefined {
    return notes.value.find((item) => item.id === id)
  }

  return { notes, loaded, revision, ensureLoaded, reloadFromStorage, upsert, remove, getById, flush }
})