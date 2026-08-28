<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    title?: string
    ariaLabel?: string
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
    title: undefined,
    ariaLabel: undefined,
  },
)

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--block': block }]"
    :disabled="disabled"
    :title="title ?? ariaLabel"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span v-if="$slots.default" class="ui-button__label"><slot /></span>
  </button>
</template>

<style lang="scss" scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:not(:disabled):active {
    transform: translateY(1px);
  }

  &--sm {
    padding: 7px 12px;
    font-size: 13px;
    height: 34px;
  }

  &--md {
    padding: 10px 18px;
    font-size: 14px;
    height: 42px;
  }

  &--block {
    display: flex;
    width: 100%;
  }

  &--primary {
    background: var(--color-primary);
    color: #fff;
    box-shadow: var(--shadow-sm);

    &:not(:disabled):hover {
      background: var(--color-primary-hover);
    }
  }

  &--secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
    box-shadow: var(--shadow-sm);

    &:not(:disabled):hover {
      background: var(--color-bg);
      border-color: var(--color-text-muted);
    }
  }

  &--danger {
    background: var(--color-danger);
    color: #fff;
    box-shadow: var(--shadow-sm);

    &:not(:disabled):hover {
      background: var(--color-danger-hover);
    }
  }
}
</style>