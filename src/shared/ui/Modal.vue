<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { overlayCount } from '~/shared/lib/overlays'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg'
    closeOnBackdrop?: boolean
    closeOnEscape?: boolean
    closable?: boolean
  }>(),
  {
    title: undefined,
    size: 'md',
    closeOnBackdrop: true,
    closeOnEscape: true,
    closable: true,
  },
)

const emit = defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const titleId = `ui-modal-title-${Math.random().toString(36).slice(2, 9)}`

let previouslyFocused: HTMLElement | null = null

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.getClientRects().length > 0)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (props.closeOnEscape) emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const panel = panelRef.value
  if (!panel) return
  const items = getFocusables(panel)
  if (!items.length) return

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault()
    first?.focus()
  }
}

function handleBackdropMousedown(event: MouseEvent): void {
  if (event.target === event.currentTarget && props.closeOnBackdrop) emit('close')
}

watch(
  () => open,
  async (open) => {
    await nextTick()
    const panel = panelRef.value
    if (!open) {
      overlayCount.value = Math.max(0, overlayCount.value - 1)
      document.body.classList.remove('is-modal-open')
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
      previouslyFocused = null
      return
    }

    overlayCount.value += 1
    document.body.classList.add('is-modal-open')
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (!panel) return
    const autofocus = panel.querySelector<HTMLElement>('[data-ui-autofocus]')
    const target = autofocus ?? getFocusables(panel)[0] ?? panel
    target.focus({ preventScroll: true })
  },
  { immediate: true },
)

onMounted(() => document.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => {
  overlayCount.value = Math.max(0, overlayCount.value - 1)
  document.body.classList.remove('is-modal-open')
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="ui-modal">
      <div v-show="open" class="ui-modal">
        <div class="ui-modal__backdrop" @mousedown.self="handleBackdropMousedown"></div>
        <div
          ref="panelRef"
          class="ui-modal__panel"
          :class="`ui-modal__panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
        >
          <header v-if="title || closable" class="ui-modal__header">
            <h2 v-if="title" :id="titleId" class="ui-modal__title">{{ title }}</h2>
            <span class="ui-modal__spacer"></span>
            <button
              v-if="closable"
              type="button"
              class="ui-modal__close"
              aria-label="Закрыть"
              @click="emit('close')"
            >
              <CrossIcon />
            </button>
          </header>
          <div class="ui-modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="ui-modal__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.ui-modal {
  &__backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgb(15 23 42 / 0.45);
    backdrop-filter: blur(2px);
  }

  &__panel {
    position: fixed;
    z-index: 1001;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    width: calc(100% - 32px);
    max-height: calc(100dvh - 48px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    outline: none;

    &--sm {
      max-width: 420px;
    }

    &--md {
      max-width: 560px;
    }

    &--lg {
      max-width: 720px;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 18px 20px 0;
  }

  &__spacer {
    flex: 1;
  }

  &__title {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }
  }

  &__body {
    padding: 14px 20px 18px;
    overflow-y: auto;
    color: var(--color-text);
    font-size: 15px;
    line-height: 1.5;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 0 20px 20px;
    flex-wrap: wrap;
  }
}

.ui-modal-enter-active,
.ui-modal-leave-active {
  transition: opacity 160ms ease;
}

.ui-modal-enter-active .ui-modal__panel,
.ui-modal-leave-active .ui-modal__panel {
  transition: transform 160ms ease, opacity 160ms ease;
}

.ui-modal-enter-from,
.ui-modal-leave-to {
  opacity: 0;
}

.ui-modal-enter-from .ui-modal__panel,
.ui-modal-leave-to .ui-modal__panel {
  transform: translate(-50%, calc(-50% + 8px));
}
</style>