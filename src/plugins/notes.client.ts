import { useNotesStore } from '~/entities/note/notes-store'

export default defineNuxtPlugin(() => {
  const notes = useNotesStore()
  notes.ensureLoaded()
})