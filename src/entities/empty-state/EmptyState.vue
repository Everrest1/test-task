<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel?: string
  }>(),
  {
    description: '',
    actionLabel: '',
  },
)

defineEmits<{ action: [event: MouseEvent] }>()
</script>

<template>
  <div class="ui-empty-state">
    <h2 class="ui-empty-state__title">{{ props.title }}</h2>
    <p v-if="props.description" class="ui-empty-state__description">{{ props.description }}</p>
    <UiButton v-if="props.actionLabel" variant="primary" @click="$emit('action', $event)">{{
        props.actionLabel
    }}</UiButton>
  </div>
</template>

<style lang="scss" scoped>
.ui-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 48px 24px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text);
  }

  &__description {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
    max-width: 46ch;
  }
}
</style>