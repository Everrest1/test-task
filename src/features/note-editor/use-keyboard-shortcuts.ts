import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from './editor-store'

export interface UndoRedoActions {
  undo(): void
  redo(): void
}

export interface UndoRedoContext {
  editableTarget: boolean
  inProgressText: boolean
  overlayVisible: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

export function hasVisibleModal(): boolean {
  return Array.from(document.querySelectorAll('.ui-modal')).some(
    (el) => getComputedStyle(el).display !== 'none',
  )
}

export function handleUndoRedoKey(
  event: KeyboardEvent,
  actions: UndoRedoActions,
  context: UndoRedoContext,
): boolean {
  if (!event.ctrlKey && !event.metaKey) return false
  if (event.code !== 'KeyZ') return false

  if (context.editableTarget && context.inProgressText) return false

  event.preventDefault()

  if (context.overlayVisible) return true

  if (event.shiftKey) actions.redo()
  else actions.undo()
  return true
}

export function useEditorShortcuts(): void {
  const editor = useEditorStore()

  function onKeydown(event: KeyboardEvent): void {
    handleUndoRedoKey(event, editor, {
      editableTarget: isEditableTarget(event.target),
      inProgressText: editor.hasInProgressText,
      overlayVisible: hasVisibleModal(),
    })
  }

  onMounted(() => window.addEventListener('keydown', onKeydown, { capture: true }))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown, { capture: true }))
}