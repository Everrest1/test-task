import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { NOTES_STORAGE_KEY, setStorageOverride } from '~/shared/utils/storage'
import { useNotesStore } from '~/entities/note/notes-store'
import { useDraftsStore } from '~/entities/note/drafts-store'
import { useEditorStore, CREATE_ID } from '~/features/note-editor/editor-store'
import { createMemoryStorage, type MemoryStorage } from '../support/memory-storage'
import { makeNote } from '../support/make-note'

describe('editor store', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = createMemoryStorage()
    setStorageOverride(storage)
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    setStorageOverride(null)
  })

  describe('init', () => {
    it('starts an empty create session', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      expect(editor.mode).toBe('create')
      expect(editor.note).not.toBeNull()
      expect(editor.note!.todos).toEqual([])
      expect(editor.hasChanges).toBe(false)
      expect(editor.notFound).toBe(false)
    })

    it('treats the /notes/create route id as a create session', async () => {
      const editor = useEditorStore()
      await editor.init('create')
      expect(editor.mode).toBe('create')
      expect(editor.notFound).toBe(false)
      expect(editor.note).not.toBeNull()
    })

    it('reports notFound for a missing note without a draft', async () => {
      const editor = useEditorStore()
      await editor.init('no-such-note')
      expect(editor.notFound).toBe(true)
      expect(editor.note).toBeNull()
    })

    it('loads an existing note in edit mode', async () => {
      const notes = useNotesStore()
      const note = makeNote({ title: 'существующая' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      expect(editor.mode).toBe('edit')
      expect(editor.note?.title).toBe('существующая')
      expect(editor.hasChanges).toBe(false)
      expect(editor.canUndo).toBe(false)
    })
  })

  describe('text editing history', () => {
    it('commits continuous typing as a single entry on blur', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)

      editor.onTitleFocus()
      editor.note!.title = 'м'
      editor.onTitleInput()
      editor.note!.title = 'мо'
      editor.onTitleInput()
      editor.note!.title = 'мой'
      editor.onTitleInput()
      expect(editor.canUndo).toBe(false)

      editor.onTitleBlur()
      expect(editor.canUndo).toBe(true)

      editor.undo()
      expect(editor.note!.title).toBe('')
      editor.redo()
      expect(editor.note!.title).toBe('мой')
    })

    it('commits typing on an input pause', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)

      editor.onTitleFocus()
      editor.note!.title = 'одна запись'
      editor.onTitleInput()
      vi.advanceTimersByTime(900)
      expect(editor.canUndo).toBe(true)
      expect(editor.hasInProgressText).toBe(false)

      editor.undo()
      expect(editor.note!.title).toBe('')
    })

    it('starts a new entry when typing resumes after a pause', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      editor.onTitleFocus()
      editor.note!.title = 'aa'
      editor.onTitleInput()
      vi.advanceTimersByTime(900) // first entry

      editor.note!.title = 'aab'
      editor.onTitleInput()
      vi.advanceTimersByTime(900) // second entry

      expect(editor.canUndo).toBe(true)
      editor.undo()
      expect(editor.note!.title).toBe('aa')
      editor.undo()
      expect(editor.note!.title).toBe('')
    })

    it('records no entry when the field value did not change', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      editor.onTitleFocus()
      editor.onTitleInput()
      editor.onTitleBlur()
      expect(editor.canUndo).toBe(false)
    })

    it('does not target a stale todo index after a splice shifts indices', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)

      const a = editor.addTodo('A')!
      const b = editor.addTodo('B')!

      editor.onTodoFocus(b.id)
      editor.note!.todos[1].text = 'Btyped'
      editor.onTodoInput()
      vi.advanceTimersByTime(900)
      expect(editor.canUndo).toBe(true)

      editor.removeTodo(a.id)
      expect(editor.note!.todos.map((t) => t.text)).toEqual(['Btyped'])

      editor.note!.todos[0].text = 'BtypedZ'
      editor.onTodoInput()
      editor.onTodoBlur()

      editor.undo()
      expect(editor.note!.todos.map((t) => t.text)).toEqual(['Btyped'])

      while (editor.canUndo) editor.undo()
      expect(editor.note!.todos).toHaveLength(0)
    })
  })

  describe('atomic operations', () => {
    it('adds, toggles and removes todos with undo/redo support', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)

      const first = editor.addTodo('купить молоко')!
      const second = editor.addTodo('позвонить врачу')!
      editor.toggleTodo(first.id)

      expect(editor.note!.todos[0].done).toBe(true)

      editor.undo()
      expect(editor.note!.todos[0].done).toBe(false)

      editor.undo()
      expect(editor.note!.todos.map((t) => t.id)).toEqual([first.id])

      editor.undo()
      expect(editor.note!.todos).toEqual([])

      editor.redo()
      editor.redo()
      editor.redo()
      expect(editor.note!.todos.map((t) => t.text)).toEqual(['купить молоко', 'позвонить врачу'])
      expect(editor.note!.todos[0].done).toBe(true)
    })

    it('rejects empty todo text', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      expect(editor.addTodo('   ')).toBeNull()
      expect(editor.note!.todos).toHaveLength(0)
    })

    it('removes a todo permanently', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      const todo = editor.addTodo('удалить')!
      editor.removeTodo(todo.id)
      expect(editor.note!.todos).toHaveLength(0)
      editor.undo()
      expect(editor.note!.todos.map((t) => t.id)).toEqual([todo.id])
    })
  })

  describe('history stack semantics', () => {
    it('clears redo after a new change', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      editor.addTodo('a')
      editor.undo()
      expect(editor.canRedo).toBe(true)
      editor.addTodo('b')
      expect(editor.canRedo).toBe(false)
    })

    it('limits history to 50 steps', async () => {
      const editor = useEditorStore()
      await editor.init(CREATE_ID)
      for (let i = 0; i < 55; i += 1) editor.addTodo(`task${i}`)

      expect(editor.note!.todos).toHaveLength(55)

      let undos = 0
      while (editor.canUndo) {
        editor.undo()
        undos += 1
      }
      expect(undos).toBe(50)
      expect(editor.note!.todos).toHaveLength(5)
    })
  })

  describe('save', () => {
    it('persists the note, clears the draft and resets history', async () => {
      const notes = useNotesStore()
      const drafts = useDraftsStore()
      const editor = useEditorStore()
      await editor.init(CREATE_ID)

      editor.note!.title = 'Мой план'
      editor.onTitleInput()
      editor.addTodo('собрать шкаф')
      vi.advanceTimersByTime(700)
      expect(drafts.getDraft(CREATE_ID)).toBeTruthy()

      const savedId = editor.save()
      expect(savedId).toBeTruthy()
      expect(editor.mode).toBe('edit')

      const saved = notes.getById(savedId!)
      expect(saved?.title).toBe('Мой план')
      expect(saved?.todos.map((t) => t.text)).toEqual(['собрать шкаф'])

      expect(drafts.getDraft(CREATE_ID)).toBeNull()
      expect(editor.hasChanges).toBe(false)
      expect(editor.canUndo).toBe(false)
      expect(editor.canRedo).toBe(false)

      vi.advanceTimersByTime(500)
      expect(storage.entries.has(NOTES_STORAGE_KEY)).toBe(true)
    })

    it('updates an existing note in edit mode', async () => {
      const notes = useNotesStore()
      const note = makeNote({ title: 'старая' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      editor.note!.title = 'новая'
      editor.onTitleInput()
      editor.onTitleBlur()

      editor.save()
      expect(notes.notes).toHaveLength(1)
      expect(notes.getById(note.id)?.title).toBe('новая')
      expect(editor.hasChanges).toBe(false)
    })

    it('re-creates a note that was deleted in another tab', async () => {
      const notes = useNotesStore()
      const note = makeNote({ title: 'victim' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      notes.remove(note.id)
      await nextTick()
      expect(editor.deletedExternally).toBe(true)

      editor.save()
      expect(editor.deletedExternally).toBe(false)
      expect(notes.getById(note.id)?.title).toBe('victim')
    })
  })

  describe('drafts', () => {
    it('offers the draft on reload and restores it', async () => {
      const notes = useNotesStore()
      const drafts = useDraftsStore()
      const note = makeNote({ title: 'сохранённая' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      editor.addTodo('черновое')
      vi.advanceTimersByTime(700)
      expect(drafts.getDraft(note.id)).toBeTruthy()

      await editor.init(note.id)
      expect(editor.draftAvailable).toBe(true)

      editor.acceptDraft()
      expect(editor.draftAvailable).toBe(false)
      expect(editor.note!.todos.map((t) => t.text)).toEqual(['черновое'])
      expect(editor.hasChanges).toBe(true)
    })

    it('restores a draft for a deleted note as a new one', async () => {
      const notes = useNotesStore()
      const drafts = useDraftsStore()
      const note = makeNote({ title: 'удалена в другой вкладке' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      notes.remove(note.id)
      drafts.saveDraft(note.id, { note: { ...note, title: 'черновик' }, savedAt: 123 })

      await editor.init(note.id)
      expect(editor.notFound).toBe(false)
      expect(editor.draftAvailable).toBe(true)

      editor.acceptDraft()
      expect(editor.note!.title).toBe('черновик')
      const savedId = editor.save()
      expect(notes.getById(savedId!)?.title).toBe('черновик')
    })

    it('discards the draft and returns to the saved version', async () => {
      const notes = useNotesStore()
      const drafts = useDraftsStore()
      const note = makeNote({ title: 'стабильная' })
      notes.upsert(note)
      drafts.saveDraft(note.id, { note: { ...note, title: 'черновик' }, savedAt: 1 })

      const editor = useEditorStore()
      await editor.init(note.id)
      expect(editor.draftAvailable).toBe(true)

      editor.discardDraft()
      expect(editor.draftAvailable).toBe(false)
      expect(editor.note?.title).toBe('стабильная')
      expect(drafts.getDraft(note.id)).toBeNull()
    })

    it('clears the draft on cancel', async () => {
      const notes = useNotesStore()
      const drafts = useDraftsStore()
      const note = makeNote({ title: 'отмена' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      editor.note!.title = 'не сохраню'
      editor.onTitleInput()
      vi.advanceTimersByTime(700)
      expect(drafts.getDraft(note.id)).toBeTruthy()

      editor.cancelEditing()
      expect(editor.note).toBeNull()
      expect(drafts.getDraft(note.id)).toBeNull()
    })

    it('keeps the working copy out of the persisted list until save', async () => {
      const notes = useNotesStore()
      const note = makeNote({ title: 'исходная' })
      notes.upsert(note)

      const editor = useEditorStore()
      await editor.init(note.id)
      editor.note!.title = 'рабочая копия'
      expect(notes.getById(note.id)?.title).toBe('исходная')
    })
  })
})