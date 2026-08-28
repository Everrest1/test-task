<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'text' | 'number' | 'email'
    modelValue: string
    label?: string
    placeholder?: string
    hint?: string
    disabled?: boolean
    autocomplete?: string
    id?: string
    autofocus?: boolean
    ariaLabel?: string
  }>(),
  {
    type: 'text',
    label: undefined,
    placeholder: undefined,
    hint: undefined,
    disabled: false,
    autocomplete: undefined,
    id: undefined,
    autofocus: false,
    ariaLabel: undefined,
  },
)

const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  input: []
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}>()

function onInput(event: Event): void {
  model.value = (event.target as HTMLInputElement).value
  emit('input')
}
</script>

<template>
  <div class="ui-text">
    <label v-if="label" class="ui-text__label" :for="id">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="model"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :autofocus="autofocus"
      :aria-label="ariaLabel"
      class="ui-text__field"
      @input="onInput"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @keydown="emit('keydown', $event)"
    />
    <p v-if="hint" class="ui-text__hint">{{ hint }}</p>
  </div>
</template>

<style lang="scss" scoped>
.ui-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__field {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 15px;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-surface);
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
    min-height: 42px;

    &::placeholder {
      color: var(--color-text-muted);
      opacity: 0.7;
    }

    &:hover {
      border-color: var(--color-text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--focus-ring);
    }

    &:disabled {
      background: var(--color-bg);
      color: var(--color-text-muted);
      cursor: not-allowed;
    }
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-muted);
  }
}
</style>