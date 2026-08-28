// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createApp, defineComponent, h } from 'vue'
import { useEditorStore } from '~/features/note-editor/editor-store'
import { useEditorShortcuts } from '~/features/note-editor/use-keyboard-shortcuts'

function makeKeydownEvent(init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { cancelable: true, ...init })
  Object.defineProperty(event, 'code', { value: init.code ?? 'KeyZ' })
  return event
}

describe('useEditorShortcuts integration', () => {
  let pinia: Pinia
  let host: HTMLDivElement
  let app: ReturnType<typeof createApp>

  const EditorPage = defineComponent({
    setup() {
      useEditorShortcuts()
      return () => h('div', 'editor')
    },
  })

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({ render: () => h(EditorPage) })
    app.use(pinia)
    app.mount(host)
    await useEditorStore().init('__create')
  })

  afterEach(() => {
    app.unmount()
    host.remove()
    document.body.innerHTML = ''
  })

  it('undoes via Ctrl+Z even with a Russian layout key', async () => {
    const editor = useEditorStore()
    editor.addTodo('молоко')
    expect(editor.note!.todos).toHaveLength(1)

    window.dispatchEvent(makeKeydownEvent({ key: 'я', code: 'KeyZ', ctrlKey: true }))

    expect(editor.note!.todos).toHaveLength(0)
  })

  it('redoes via Ctrl+Shift+Z', async () => {
    const editor = useEditorStore()
    editor.addTodo('молоко')
    const todo = editor.note!.todos[0]!
    editor.toggleTodo(todo.id)

    window.dispatchEvent(makeKeydownEvent({ key: 'z', ctrlKey: true }))
    expect(editor.note!.todos[0]!.done).toBe(false)

    window.dispatchEvent(makeKeydownEvent({ key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true }))
    expect(editor.note!.todos[0]!.done).toBe(true)
  })

  it('does not fire for unrelated keys', async () => {
    const editor = useEditorStore()
    editor.addTodo('молоко')

    window.dispatchEvent(makeKeydownEvent({ key: 'y', code: 'KeyY', ctrlKey: true }))

    expect(editor.note!.todos).toHaveLength(1)
  })

  it('prevents the native default action of Ctrl+Z', () => {
    const event = makeKeydownEvent({ key: 'z', code: 'KeyZ', ctrlKey: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('blocks Ctrl+Z only when a modal overlay is actually visible', async () => {
    const editor = useEditorStore()
    editor.addTodo('молоко')

    const modal = document.createElement('div')
    modal.className = 'ui-modal'
    modal.style.display = 'block'
    document.body.appendChild(modal)

    window.dispatchEvent(makeKeydownEvent({ key: 'z', code: 'KeyZ', ctrlKey: true }))
    expect(editor.note!.todos).toHaveLength(1)

    modal.remove()
    window.dispatchEvent(makeKeydownEvent({ key: 'z', code: 'KeyZ', ctrlKey: true }))
    expect(editor.note!.todos).toHaveLength(0)
  })
})