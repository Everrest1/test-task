import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  dismissLabel?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Подтвердить',
  dismissLabel: 'Отмена',
  danger: false,
})

let resolver: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    Object.assign(state, { open: true, ...options })
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function settle(value: boolean): void {
    state.open = false
    resolver?.(value)
    resolver = null
  }

  function confirmAction(): void {
    settle(true)
  }

  function dismissAction(): void {
    settle(false)
  }

  return { state, confirm, confirmAction, dismissAction }
}