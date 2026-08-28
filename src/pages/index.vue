<script setup lang="ts">
import { useNotesStore } from '~/entities/note/notes-store'
import { useConfirm } from '~/entities/confirm/useConfirm'

const notesStore = useNotesStore()
const { confirm } = useConfirm()

function goCreate(): void {
  navigateTo('/notes/create')
}

function goEdit(id: string): void {
  navigateTo(`/notes/${id}`)
}

async function askDelete(id: string): Promise<void> {
  const note = notesStore.getById(id)
  if (!note) return
  const ok = await confirm({
    title: 'Удалить заметку?',
    message: `Заметка ${note.title.trim() ? `«${note.title.trim()}»` : 'без названия'} и все её задачи будут удалены безвозвратно.`,
    confirmLabel: 'Удалить',
    dismissLabel: 'Отмена',
    danger: true,
  })
  if (ok) notesStore.remove(note.id)
}
</script>

<template>
  <div class="notes-page">
    <header class="notes-page__header">
      <h1 class="notes-page__title">Заметки</h1>
      <UiButton variant="primary" @click="goCreate">Создать заметку</UiButton>
    </header>

    <NoteList
      v-if="notesStore.notes.length"
      :notes="notesStore.notes"
      @edit="goEdit"
      @remove="askDelete"
    />

    <EmptyState
      v-else
      title="Пока нет заметок"
      description="Создайте первую заметку и добавьте в неё задачи."
      action-label="Создать заметку"
      @action="goCreate"
    />
  </div>
</template>

<style lang="scss" scoped>
.notes-page {
  display: flex;
  flex-direction: column;
  gap: 24px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
}
</style>