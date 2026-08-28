<script setup lang="ts">
import type { Note } from '~/entities/note/model'

defineProps<{ note: Note }>()
defineEmits<{ edit: [id: string]; remove: [id: string] }>()
</script>

<template>
  <article class="note-card">
    <button type="button" class="note-card__title" @click="$emit('edit', note.id)">
      {{ note.title.trim() || 'Без названия' }}
    </button>

    <ul v-if="note.todos.length" class="note-card__todos">
      <li
        v-for="todo in note.todos.slice(0, 3)"
        :key="todo.id"
        class="note-card__todo"
        :class="{ 'note-card__todo--done': todo.done }"
      >
        <UiCheckbox :model-value="todo.done" disabled />
        <span class="note-card__todo-text">{{ todo.text.trim() || '—' }}</span>
      </li>
      <li v-if="note.todos.length > 3" class="note-card__more">+ ещё {{ note.todos.length - 3 }}</li>
    </ul>
    <p v-else class="note-card__empty">Нет задач</p>

    <footer class="note-card__footer">
      <UiButton variant="secondary" size="sm" @click="$emit('edit', note.id)">
        Редактировать
      </UiButton>
      <UiButton variant="secondary" size="sm" @click="$emit('remove', note.id)">
        Удалить
      </UiButton>
    </footer>
  </article>
</template>

<style lang="scss" scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow var(--transition-fast),
    transform var(--transition-fast),
    border-color var(--transition-fast);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--color-primary);
  }

  &__title {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text);
    cursor: pointer;
    overflow-wrap: anywhere;

    &:hover {
      color: var(--color-primary);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
      border-radius: 4px;
    }
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__todo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--color-text);

    &--done {
      .note-card__todo-text {
        text-decoration: line-through;
        color: var(--color-text-muted);
      }
    }
  }

  &__todo-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__more {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  &__empty {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-muted);
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    flex-wrap: wrap;
  }
}
</style>