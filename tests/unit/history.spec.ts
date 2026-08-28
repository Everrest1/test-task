import { describe, expect, it } from 'vitest'
import type { Note } from '~/entities/note/model'
import { cloneNote, createTodoItem } from '~/entities/note/model'
import { applyEntry, revertEntry, type HistoryEntry } from '~/entities/history/history'
import { HistoryStack } from '~/entities/history/history-stack'
import { getValueAtPath } from '~/shared/lib/paths'
import { makeNote } from '../support/make-note'

function worker(): { note: Note; history: HistoryStack } {
  const note: Note = makeNote()
  const history = new HistoryStack({
    getCurrentValue: (path) => getValueAtPath(note, path),
  })
  return { note, history }
}

describe('history patches', () => {
  it('applies and reverts a field set', () => {
    const note = makeNote({ title: 'a' })
    const entry = { op: 'set', path: ['title'], prev: 'a', next: 'b' } as const
    applyEntry(note, entry)
    expect(note.title).toBe('b')
    revertEntry(note, entry)
    expect(note.title).toBe('a')
  })

  it('applies and reverts a nested set via index path', () => {
    const todo = createTodoItem('x')
    const note = makeNote({ todos: [todo] })
    const entry = { op: 'set', path: ['todos', 0, 'done'], prev: false, next: true } as const
    applyEntry(note, entry)
    expect(note.todos[0].done).toBe(true)
    revertEntry(note, entry)
    expect(note.todos[0].done).toBe(false)
  })

  it('applies and reverts a todo insert', () => {
    const note = makeNote()
    const item = createTodoItem('new')
    const entry = { op: 'splice', path: ['todos'], index: 0, removeCount: 0, removed: [], inserted: [item] } as const
    applyEntry(note, entry)
    expect(note.todos).toHaveLength(1)
    revertEntry(note, entry)
    expect(note.todos).toHaveLength(0)
  })

  it('applies and reverts a todo removal', () => {
    const item = createTodoItem('old')
    const note = makeNote({ todos: [item] })
    const entry = { op: 'splice', path: ['todos'], index: 0, removeCount: 1, removed: [item], inserted: [] } as const
    applyEntry(note, entry)
    expect(note.todos).toHaveLength(0)
    revertEntry(note, entry)
    expect(note.todos.map((t) => t.id)).toEqual([item.id])
  })

  it('keeps objects stable across undo/redo', () => {
    const a = createTodoItem('a')
    const note = makeNote({ todos: [a] })
    const removeEntry = { op: 'splice', path: ['todos'], index: 0, removeCount: 1, removed: [a], inserted: [] } as const
    applyEntry(note, removeEntry)
    revertEntry(note, removeEntry)
    expect(note.todos[0]).toBe(a)
    expect(cloneNote(note).todos[0]).toEqual(a)
  })
})

describe('HistoryStack', () => {
  it('merges continuous typing into a single entry committed on blur', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    note.title = 'H'
    note.title = 'He'
    note.title = 'Hello'
    history.commitPendingText()
    expect(history.undoSize).toBe(1)
    history.commitPendingText()
    expect(history.undoSize).toBe(1)
  })

  it('produces no entry when the value did not change', () => {
    const { history } = worker()
    history.beginTextEdit(['title'])
    history.commitPendingText()
    expect(history.undoSize).toBe(0)
  })

  it('commits a pending edit before tracking another field', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    note.title = 'abc'
    history.beginTextEdit(['title'])
    expect(history.undoSize).toBe(1)
    expect(history.redoSize).toBe(0)
  })

  it('undo/redo moves entries between stacks', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    note.title = 'x'
    history.commitPendingText()

    expect(history.undoSize).toBe(1)
    expect(history.redoSize).toBe(0)

    const entry = history.undo()!
    expect(entry).toBeDefined()
    expect(history.undoSize).toBe(0)
    expect(history.redoSize).toBe(1)

    history.redo()
    expect(history.redoSize).toBe(0)
    expect(history.undoSize).toBe(1)
  })

  it('a new change after undo clears the redo branch', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    note.title = 'one'
    history.commitPendingText()

    history.undo()
    expect(history.redoSize).toBe(1)

    history.push({ op: 'set', path: ['title'], prev: '', next: 'two' })
    expect(history.redoSize).toBe(0)
  })

  it('enforces the step limit dropping the oldest entries', () => {
    const { note, history } = worker()
    for (let i = 0; i < 55; i += 1) {
      const item = createTodoItem(`t${i}`)
      const entry = { op: 'splice', path: ['todos'], index: note.todos.length, removeCount: 0, removed: [], inserted: [item] } as const
      history.push(entry)
      note.todos.push(item)
    }
    expect(history.undoSize).toBe(50)

    let undone = 0
    let entry: HistoryEntry | null
    while ((entry = history.undo())) {
      revertEntry(note, entry)
      undone += 1
    }
    expect(undone).toBe(50)
    expect(note.todos).toHaveLength(5)
  })

  it('tracks the pending state only once a value changed', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    expect(history.hasPendingChange()).toBe(false)
    note.title = 'typed'
    expect(history.hasPendingChange()).toBe(true)
    history.commitPendingText()
    expect(history.hasPendingChange()).toBe(false)
  })

  it('reset clears both stacks', () => {
    const { note, history } = worker()
    history.beginTextEdit(['title'])
    note.title = 'x'
    history.commitPendingText()
    history.undo()
    history.reset()
    expect(history.undoSize).toBe(0)
    expect(history.redoSize).toBe(0)
  })

  it('reanchor keeps the baseline value while re-pointing the path', () => {
    const todoA = createTodoItem('A')
    const todoB = createTodoItem('B')
    const { note, history } = worker()
    note.todos = [todoA, todoB]

    history.beginTextEdit(['todos', 1, 'text'])
    note.todos[1].text = 'Btyped'

    note.todos.splice(0, 1)
    history.reanchorPending(['todos', 0, 'text'])
    note.todos[0].text = 'BtypedZ'

    history.commitPendingText()
    expect(history.undoSize).toBe(1)

    const entry = history.undo()!
    expect(entry).toMatchObject({ op: 'set', path: ['todos', 0, 'text'] })
    expect(entry).toMatchObject({ prev: 'B', next: 'BtypedZ' })
  })

  it('reanchor after the target was removed drops the pending edit', () => {
    const todo = createTodoItem('X')
    const { note, history } = worker()
    note.todos = [todo]

    history.beginTextEdit(['todos', 0, 'text'])
    note.todos[0].text = 'typed'
    history.reanchorPending(['todos', 0, 'text'])
    history.commitPendingText()
    expect(history.undoSize).toBe(1)
  })
})