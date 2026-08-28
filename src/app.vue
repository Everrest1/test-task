<script setup lang="ts">
import { useNotesStore } from '~/entities/note/notes-store'

const notesStore = useNotesStore()

onMounted(() => {
  notesStore.ensureLoaded()
  window.addEventListener('pagehide', () => notesStore.flush())
})
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <NuxtLink to="/" class="app-shell__brand">
        <span class="app-shell__logo">З</span>
        Заметки
      </NuxtLink>
    </header>

    <main class="app-shell__main">
      <NuxtPage />
    </main>

    <ConfirmDialog />
  </div>
</template>

<style lang="scss" scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;

  &__header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    padding: 14px max(16px, calc((100% - var(--max-width)) / 2));
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-border);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 800;
    color: var(--color-text);
    text-decoration: none;
    letter-spacing: -0.01em;

    &:hover {
      color: var(--color-primary);
    }
  }

  &__logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--color-primary);
    color: #fff;
    font-size: 15px;
    font-weight: 800;
  }

  &__main {
    flex: 1;
    padding: 24px max(16px, calc((100% - var(--max-width)) / 2));
  }
}
</style>