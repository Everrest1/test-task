import type { HistoryEntry, SetEntry } from './history'
import type { Path } from '~/shared/lib/paths'

export interface HistoryStackOptions {
  limit?: number
  getCurrentValue: (path: Path) => unknown
  onChange?: () => void
}

interface PendingText {
  path: Path
  prev: unknown
}

export class HistoryStack {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private pending: PendingText | null = null
  private readonly getVal: (path: Path) => unknown
  private readonly onChange: (() => void) | undefined
  readonly limit: number

  constructor(options: HistoryStackOptions) {
    this.limit = options.limit ?? 50
    this.getVal = options.getCurrentValue
    this.onChange = options.onChange
  }

  get undoSize(): number {
    return this.undoStack.length
  }

  get redoSize(): number {
    return this.redoStack.length
  }

  get pendingText(): PendingText | null {
    return this.pending
  }

  hasPendingChange(): boolean {
    if (!this.pending) return false
    return this.pending.prev !== this.getVal(this.pending.path)
  }

  beginTextEdit(path: Path): void {
    this.commitPendingText()
    this.pending = { path, prev: this.getVal(path) }
  }

  commitPendingText(): HistoryEntry | null {
    const pending = this.pending
    if (!pending) return null
    this.pending = null

    const next = this.getVal(pending.path)
    if (pending.prev === next) return null

    const entry: SetEntry = { op: 'set', path: pending.path, prev: pending.prev, next }
    this.push(entry)
    return entry
  }

  discardPendingText(): void {
    this.pending = null
  }

  reanchorPending(path: Path): void {
    if (!this.pending) return
    this.pending.path = path
  }

  push(entry: HistoryEntry): void {
    this.redoStack.length = 0
    this.undoStack.push(entry)
    if (this.undoStack.length > this.limit) this.undoStack.shift()
    this.onChange?.()
  }

  undo(): HistoryEntry | null {
    this.commitPendingText()
    const entry = this.undoStack.pop()
    if (!entry) return null
    this.redoStack.push(entry)
    this.onChange?.()
    return entry
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop()
    if (!entry) return null
    this.undoStack.push(entry)
    this.onChange?.()
    return entry
  }

  reset(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.pending = null
    this.onChange?.()
  }
}
