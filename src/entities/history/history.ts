import type { Note } from '~/entities/note/model'
import { getValueAtPath, setValueAtPath, type Path } from '~/shared/lib/paths'

export interface SetEntry {
  op: 'set'
  path: Path
  prev: unknown
  next: unknown
}

export interface SpliceEntry {
  op: 'splice'
  path: Path
  index: number
  removeCount: number
  removed: unknown[]
  inserted: unknown[]
}

export type HistoryEntry = SetEntry | SpliceEntry

export function applyEntry(note: Note, entry: HistoryEntry): void {
  switch (entry.op) {
    case 'set':
      setValueAtPath(note, entry.path, entry.next)
      break
    case 'splice': {
      const array = getValueAtPath(note, entry.path) as unknown[]
      array.splice(entry.index, entry.removeCount, ...entry.inserted)
      break
    }
  }
}

export function revertEntry(note: Note, entry: HistoryEntry): void {
  switch (entry.op) {
    case 'set':
      setValueAtPath(note, entry.path, entry.prev)
      break
    case 'splice': {
      const array = getValueAtPath(note, entry.path) as unknown[]
      array.splice(entry.index, entry.inserted.length, ...entry.removed)
      break
    }
  }
}