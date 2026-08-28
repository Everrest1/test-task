import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Note, TodoItem } from '~/entities/note/model'
import { cloneNote, createEmptyNote, createTodoItem } from '~/entities/note/model'
import { useNotesStore } from '~/entities/note/notes-store'
import { useDraftsStore } from '~/entities/note/drafts-store'
import { HistoryStack } from '~/entities/history/history-stack'
import { applyEntry, revertEntry } from '~/entities/history/history'
import { getValueAtPath, type Path } from '~/shared/lib/paths'

export const CREATE_ID = '__create'
export const CREATE_ROUTE = 'create'
export type EditorMode = 'edit' | 'create'
export type EditorSaveState = 'saved' | 'saving'

const TEXT_COMMIT_PAUSE_MS = 900
const DRAFT_SAVE_DEBOUNCE_MS = 600

function stateSignature(note: Note): string {
  return JSON.stringify({
    title: note.title,
    todos: note.todos.map((todo) => [todo.id, todo.text, todo.done]),
  })
}

const EMPTY_NOTE_SIGNATURE = stateSignature(createEmptyNote())

export const useEditorStore = defineStore('note-editor', () => {
  const notes = useNotesStore()
  const drafts = useDraftsStore()

  const note = ref<Note | null>(null)
  const mode = ref<EditorMode>('edit')
  const targetId = ref<string | null>(null)
  const initialNoteExisted = ref(false)
  const loading = ref(true)
  const notFound = ref(false)
  const deletedExternally = ref(false)
  const draftAvailable = ref(false)
  const draftTimestamp = ref(0)
  const savedAt = ref(0)
  const saveState = ref<EditorSaveState>('saved')
  const baseline = ref('')
  const hasInProgressText = ref(false)

  const historyVersion = ref(0)

  let history: HistoryStack | null = null
  let pauseTimer: ReturnType<typeof setTimeout> | null = null
  let draftTimer: ReturnType<typeof setTimeout> | null = null

  function ensureHistory(): HistoryStack {
    if (!history) {
      history = new HistoryStack({
        getCurrentValue: (path) => getValueAtPath(note.value, path),
        onChange: () => {
          historyVersion.value += 1
        },
      })
    }
    return history
  }

  const hasChanges = computed(() => {
    if (!note.value) return false
    return stateSignature(note.value) !== baseline.value
  })

  const canUndo = computed(() => {
    historyVersion.value
    return (history?.undoSize ?? 0) > 0
  })

  const canRedo = computed(() => {
    historyVersion.value
    return (history?.redoSize ?? 0) > 0
  })

  const saving = computed(() => saveState.value === 'saving')

  function clearTimers(): void {
    if (pauseTimer) clearTimeout(pauseTimer)
    if (draftTimer) clearTimeout(draftTimer)
    pauseTimer = null
    draftTimer = null
  }

  function commitTextNow(): void {
    hasInProgressText.value = false
    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
    reanchorToCurrent()
    ensureHistory().commitPendingText()
  }

  function reanchorToCurrent(): void {
    if (!editingTarget || !history) return
    const path = resolveEditingPath(editingTarget)
    if (path) history.reanchorPending(path)
    else history.discardPendingText()
  }

  function schedulePauseCommit(): void {
    if (pauseTimer) clearTimeout(pauseTimer)
    pauseTimer = setTimeout(() => {
      pauseTimer = null
      hasInProgressText.value = false
      reanchorToCurrent()
      ensureHistory().commitPendingText()
      if (editingTarget) beginTextEdit(editingTarget)
    }, TEXT_COMMIT_PAUSE_MS)
  }

  function scheduleDraftSave(): void {
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(() => {
      draftTimer = null
      persistDraftNow()
    }, DRAFT_SAVE_DEBOUNCE_MS)
  }

  function persistDraftNow(): void {
    if (!note.value || targetId.value == null) return
    if (!hasChanges.value) {
      drafts.removeDraft(targetId.value)
      return
    }
    drafts.saveDraft(targetId.value, {
      note: cloneNote(note.value),
      savedAt: Date.now(),
    })
  }

  function acceptDraft(): void {
    const id = targetId.value
    if (id == null) return
    const draft = drafts.getDraft(id)
    if (!draft) return
    note.value = cloneNote(draft.note)
    notFound.value = false
    draftAvailable.value = false
    history?.reset()
    history = null
    const stored = notes.getById(id)
    if (mode.value === 'create') {
      baseline.value = EMPTY_NOTE_SIGNATURE
    } else {
      baseline.value = stored ? stateSignature(stored) : ''
    }
    if (stored) savedAt.value = stored.updatedAt
    persistDraftNow()
  }

  function discardDraft(): void {
    const id = targetId.value
    if (id == null) return
    drafts.removeDraft(id)
    draftAvailable.value = false
    history?.reset()
    history = null
    const stored = notes.getById(id)
    if (stored) {
      useStoredNote(stored)
    } else if (mode.value === 'create') {
      note.value = createEmptyNote()
      baseline.value = EMPTY_NOTE_SIGNATURE
    } else {
      note.value = null
      notFound.value = true
    }
  }

  function resetSession(): void {
    clearTimers()
    history?.reset()
    history = null
    editingTarget = null
    note.value = null
    baseline.value = ''
    targetId.value = null
    mode.value = 'edit'
    initialNoteExisted.value = false
    notFound.value = false
    deletedExternally.value = false
    hasInProgressText.value = false
    draftAvailable.value = false
    draftTimestamp.value = 0
    savedAt.value = 0
  }

  function useStoredNote(stored: Note): void {
    note.value = cloneNote(stored)
    baseline.value = stateSignature(stored)
    savedAt.value = stored.updatedAt
    history?.reset()
    history = null
  }

  async function init(rawId: string | string[] | undefined): Promise<void> {
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    loading.value = true
    resetSession()

    if (!id || id === CREATE_ID || id === CREATE_ROUTE) {
      mode.value = 'create'
      targetId.value = CREATE_ID
      const draft = drafts.getDraft(CREATE_ID)
      if (draft) {
        draftAvailable.value = true
        draftTimestamp.value = draft.savedAt
      } else {
        note.value = createEmptyNote()
        baseline.value = EMPTY_NOTE_SIGNATURE
      }
      loading.value = false
      return
    }

    mode.value = 'edit'
    targetId.value = id
    const stored = notes.getById(id)
    initialNoteExisted.value = Boolean(stored)
    const draft = drafts.getDraft(id)
    if (draft) {
      draftAvailable.value = true
      draftTimestamp.value = draft.savedAt
    } else if (stored) {
      useStoredNote(stored)
    } else {
      notFound.value = true
      note.value = null
    }
    loading.value = false
  }

  watch(
    () => notes.revision,
    () => {
      if (mode.value !== 'edit' || !initialNoteExisted.value || loading.value) return
      if (targetId.value && !notes.getById(targetId.value) && !deletedExternally.value) {
        deletedExternally.value = true
      }
    },
  )

  type EditingTarget = { kind: 'title' } | { kind: 'todo'; id: string }

  let editingTarget: EditingTarget | null = null

  function resolveEditingPath(target: EditingTarget): Path | null {
    if (target.kind === 'title') return ['title']
    if (!note.value) return null
    const index = note.value.todos.findIndex((todo) => todo.id === target.id)
    if (index === -1) return null
    return ['todos', index, 'text']
  }

  function beginTextEdit(target: EditingTarget): void {
    editingTarget = target
    hasInProgressText.value = false
    schedulePauseCommit()
    const path = resolveEditingPath(target)
    if (path) ensureHistory().beginTextEdit(path)
    else ensureHistory().discardPendingText()
  }

  function onFieldInput(): void {
    hasInProgressText.value = true
    reanchorToCurrent()
    schedulePauseCommit()
    scheduleDraftSave()
    if (!editingTarget) return
    if (history?.pendingText == null) beginTextEdit(editingTarget)
  }

  function onFieldBlur(): void {
    editingTarget = null
    commitTextNow()
  }

  function onTitleFocus(): void {
    beginTextEdit({ kind: 'title' })
  }

  function onTodoFocus(todoId: string): void {
    if (!note.value) return
    if (note.value.todos.every((todo) => todo.id !== todoId)) return
    beginTextEdit({ kind: 'todo', id: todoId })
  }

  function afterMutation(): void {
    scheduleDraftSave()
    if (editingTarget) beginTextEdit(editingTarget)
  }

  function addTodo(text: string): TodoItem | null {
    if (!note.value) return null
    const trimmed = text.trim()
    if (!trimmed) return null
    commitTextNow()
    const item = createTodoItem(trimmed)
    const todos = note.value.todos
    ensureHistory().push({
      op: 'splice',
      path: ['todos'],
      index: todos.length,
      removeCount: 0,
      inserted: [item],
      removed: [],
    })
    todos.push(item)
    afterMutation()
    return item
  }

  function toggleTodo(todoId: string): void {
    if (!note.value) return
    commitTextNow()
    const index = note.value.todos.findIndex((todo) => todo.id === todoId)
    if (index === -1) return
    const todo = note.value.todos[index]
    if (!todo) return
    ensureHistory().push({
      op: 'set',
      path: ['todos', index, 'done'],
      prev: todo.done,
      next: !todo.done,
    })
    todo.done = !todo.done
    afterMutation()
  }

  function removeTodo(todoId: string): void {
    if (!note.value) return
    commitTextNow()
    const index = note.value.todos.findIndex((todo) => todo.id === todoId)
    if (index === -1) return
    const todos = note.value.todos
    const removed = todos[index]
    if (!removed) return
    todos.splice(index, 1)
    ensureHistory().push({
      op: 'splice',
      path: ['todos'],
      index,
      removeCount: 1,
      inserted: [],
      removed: [removed],
    })
    afterMutation()
  }

  function undo(): void {
    if (!note.value) return
    commitTextNow()
    const entry = ensureHistory().undo()
    if (!entry) return
    revertEntry(note.value, entry)
    if (editingTarget) beginTextEdit(editingTarget)
    afterMutation()
  }

  function redo(): void {
    if (!note.value) return
    commitTextNow()
    const entry = ensureHistory().redo()
    if (!entry) return
    applyEntry(note.value, entry)
    if (editingTarget) beginTextEdit(editingTarget)
    afterMutation()
  }

  function save(): string | null {
    if (!note.value) return null
    commitTextNow()
    ensureHistory().commitPendingText()
    const id = targetId.value ?? note.value.id
    const toSave = cloneNote(note.value)
    toSave.id = toSave.id === CREATE_ID ? id : toSave.id
    toSave.updatedAt = Date.now()
    saveState.value = 'saving'
    notes.upsert(toSave)
    drafts.removeDraft(id)
    if (mode.value === 'create') {
      mode.value = 'edit'
      targetId.value = toSave.id
      note.value.id = toSave.id
    }
    baseline.value = stateSignature(note.value)
    savedAt.value = toSave.updatedAt
    saveState.value = 'saved'
    history?.reset()
    history = null
    deletedExternally.value = false
    return toSave.id
  }

  function cancelEditing(): void {
    commitTextNow()
    if (targetId.value) drafts.removeDraft(targetId.value)
    history?.reset()
    history = null
    clearTimers()
    note.value = null
  }

  function deleteCurrent(): void {
    if (!targetId.value || targetId.value === CREATE_ID) return
    commitTextNow()
    drafts.removeDraft(targetId.value)
    notes.remove(targetId.value)
    history?.reset()
    history = null
    clearTimers()
    note.value = null
  }

  return {
    note,
    mode,
    targetId,
    loading,
    notFound,
    deletedExternally,
    draftAvailable,
    draftTimestamp,
    savedAt,
    saveState,
    saving,
    hasChanges,
    canUndo,
    canRedo,
    hasInProgressText,
    init,
    acceptDraft,
    discardDraft,
    onTitleFocus,
    onTitleInput: onFieldInput,
    onTitleBlur: onFieldBlur,
    onTodoFocus,
    onTodoInput: onFieldInput,
    onTodoBlur: onFieldBlur,
    addTodo,
    toggleTodo,
    removeTodo,
    undo,
    redo,
    save,
    cancelEditing,
    deleteCurrent,
  }
})