<script setup lang="ts">
import { computed, watch } from 'vue'
import { useEditorStore } from '~/features/note-editor/editor-store'
import { useEditorShortcuts } from '~/features/note-editor/use-keyboard-shortcuts'

const route = useRoute()
const editor = useEditorStore()
useEditorShortcuts()

const noteId = computed(() => String(route.params.id ?? ''))

watch(noteId, (id) => editor.init(id), { immediate: true })
</script>

<template>
  <div class="editor-page">
    <template v-if="editor.loading">
      <div class="editor-page__loading">
        <UiSpinner />
        <span>Загрузка…</span>
      </div>
    </template>

    <template v-else-if="editor.notFound">
      <EmptyState
        class="editor-page__empty"
        title="Заметка не найдена"
        description="Возможно, заметка была удалена или ссылка на неё некорректна."
        action-label="К списку заметок"
        @action="navigateTo('/')"
      />
    </template>

    <NoteEditor v-else />
  </div>
</template>

<style lang="scss" scoped>
.editor-page {
  display: flex;
  flex-direction: column;

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 80px 0;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  &__empty {
    margin-top: 24px;
  }
}
</style>