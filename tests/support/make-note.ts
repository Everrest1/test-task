import type { Note } from '~/entities/note/model'
import { createId } from '~/shared/lib/id'

let counter = 0

export function makeNote(overrides: Partial<Note> = {}): Note {
  counter += 1
  return {
    id: createId(),
    title: '',
    createdAt: 1000 + counter,
    updatedAt: 1000 + counter,
    todos: [],
    ...overrides,
  }
}