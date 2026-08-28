import { createId } from '~/shared/lib/id'

export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  todos: TodoItem[]
}

export function createTodoItem(text: string): TodoItem {
  return { id: createId(), text, done: false }
}

export function createEmptyNote(): Note {
  const now = Date.now()
  return { id: createId(), title: '', createdAt: now, updatedAt: now, todos: [] }
}

export function cloneNote(note: Note): Note {
  return { ...note, todos: note.todos.map((todo) => ({ ...todo })) }
}