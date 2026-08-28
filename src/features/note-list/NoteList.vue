<script setup lang="ts">
import type { Note } from '~/entities/note/model'

defineProps<{ notes: Note[] }>()
defineEmits<{ edit: [id: string]; remove: [id: string] }>()
</script>

<template>
  <ul class="note-list">
    <li v-for="note in notes" :key="note.id" class="note-list__item">
      <NoteCard :note="note" @edit="$emit('edit', $event)" @remove="$emit('remove', $event)" />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.note-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;

  &__item {
    display: flex;
  }

  .note-card {
    width: 100%;
  }
}
</style>