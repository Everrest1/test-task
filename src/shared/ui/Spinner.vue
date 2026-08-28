<template>
  <span class="ui-spinner" role="status" aria-label="Загрузка"></span>
</template>

<style lang="scss" scoped>
.ui-spinner {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: ui-spin 0.8s linear infinite;
}

@keyframes ui-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>