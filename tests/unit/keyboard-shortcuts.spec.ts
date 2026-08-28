import { describe, expect, it, vi } from 'vitest'
import { handleUndoRedoKey, type UndoRedoActions, type UndoRedoContext } from '~/features/note-editor/use-keyboard-shortcuts'

function makeKeydown(init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true })
  Object.assign(event, {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    key: '',
    code: '',
    ...init,
  })
  return event as KeyboardEvent
}

function actions(): UndoRedoActions {
  return { undo: vi.fn(), redo: vi.fn() }
}

function context(overrides: Partial<UndoRedoContext> = {}): UndoRedoContext {
  return { editableTarget: false, inProgressText: false, overlayVisible: false, ...overrides }
}

describe('handleUndoRedoKey', () => {
  it('undoes on Ctrl+Z regardless of keyboard layout', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'я', code: 'KeyZ' })
    expect(handleUndoRedoKey(event, a, context())).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(a.undo).toHaveBeenCalledTimes(1)
    expect(a.redo).not.toHaveBeenCalled()
  })

  it('undoes on Ctrl+Z on an English layout', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'z', code: 'KeyZ' })
    handleUndoRedoKey(event, a, context())
    expect(a.undo).toHaveBeenCalledTimes(1)
  })

  it('redoes on Ctrl+Shift+Z', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, shiftKey: true, key: 'Z', code: 'KeyZ' })
    handleUndoRedoKey(event, a, context())
    expect(a.redo).toHaveBeenCalledTimes(1)
    expect(a.undo).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'y', code: 'KeyY' })
    expect(handleUndoRedoKey(event, a, context())).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(a.undo).not.toHaveBeenCalled()
    expect(a.redo).not.toHaveBeenCalled()
  })

  it('ignores Ctrl+Z without a modifier', () => {
    const a = actions()
    const event = makeKeydown({ code: 'KeyZ' })
    expect(handleUndoRedoKey(event, a, context())).toBe(false)
    expect(a.undo).not.toHaveBeenCalled()
  })

  it('lets the browser handle Ctrl+Z while editing text with in-progress content', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'z', code: 'KeyZ' })
    expect(handleUndoRedoKey(event, a, context({ editableTarget: true, inProgressText: true }))).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(a.undo).not.toHaveBeenCalled()
    expect(a.redo).not.toHaveBeenCalled()
  })

  it('undoes the note on Ctrl+Z in an editable field with no in-progress content', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'z', code: 'KeyZ' })
    expect(handleUndoRedoKey(event, a, context({ editableTarget: true, inProgressText: false }))).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(a.undo).toHaveBeenCalledTimes(1)
  })

  it('blocks the shortcut while a modal overlay is actually open', () => {
    const a = actions()
    const event = makeKeydown({ ctrlKey: true, key: 'z', code: 'KeyZ' })
    expect(handleUndoRedoKey(event, a, context({ overlayVisible: true }))).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(a.undo).not.toHaveBeenCalled()
    expect(a.redo).not.toHaveBeenCalled()
  })

  it('handles Cmd+Z on macOS', () => {
    const a = actions()
    const event = makeKeydown({ metaKey: true, key: 'z', code: 'KeyZ' })
    handleUndoRedoKey(event, a, context())
    expect(a.undo).toHaveBeenCalledTimes(1)
  })
})