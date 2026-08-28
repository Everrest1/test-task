<script setup lang="ts">
import { useConfirm } from './useConfirm'

const { state, confirmAction, dismissAction } = useConfirm()
</script>

<template>
  <UiModal :open="state.open" size="sm" :title="state.title" @close="dismissAction">
    <p class="ui-confirm__message">{{ state.message }}</p>
    <template #footer>
      <UiButton variant="secondary" @click="dismissAction">{{ state.dismissLabel }}</UiButton>
      <UiButton
        :variant="state.danger ? 'danger' : 'primary'"
        data-ui-autofocus
        @click="confirmAction"
      >
        {{ state.confirmLabel }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style lang="scss" scoped>
.ui-confirm__message {
  margin: 0;
  color: var(--color-text);
}
</style>