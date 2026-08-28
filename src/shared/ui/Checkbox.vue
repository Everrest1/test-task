<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    disabled?: boolean
    label?: string
    indeterminate?: boolean
  }>(),
  { disabled: false, label: undefined, indeterminate: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

function onInput(event: Event): void {
  const el = event.target as HTMLInputElement
  el.indeterminate = false
  emit('update:modelValue', el.checked)
  emit('change', el.checked)
}
</script>

<template>
  <label class="ui-checkbox" :class="{ 'ui-checkbox--disabled': disabled }">
    <input
      class="ui-checkbox__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="onInput"
    />
    <span class="ui-checkbox__box" aria-hidden="true">
      <CheckIcon
        v-if="modelValue && !indeterminate"
        class="ui-checkbox__check"
      />
      <span v-else-if="indeterminate" class="ui-checkbox__dash"></span>
    </span>
    <span v-if="label" class="ui-checkbox__label">{{ label }}</span>
  </label>
</template>

<style lang="scss" scoped>
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;

  &--disabled {
    cursor: not-allowed;
    opacity: 0.85;
  }

  &__input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;

    &:focus-visible + .ui-checkbox__box {
      box-shadow: var(--focus-ring);
      border-color: var(--color-primary);
    }
  }

  &__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: #fff;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
    flex-shrink: 0;
  }

  &__dash {
    width: 10px;
    height: 2px;
    border-radius: 1px;
    background: var(--color-text-muted);
  }

  &__input:checked + .ui-checkbox__box:not(:has(.ui-checkbox__dash)) {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  &__input:checked + .ui-checkbox__box {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  &__label {
    font-size: 14px;
    color: var(--color-text);
  }

  &:hover:not(.ui-checkbox--disabled) .ui-checkbox__box {
    border-color: var(--color-primary);
  }
}
</style>