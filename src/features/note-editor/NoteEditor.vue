<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '~/features/note-editor/editor-store'
import { useConfirm } from '~/entities/confirm/useConfirm'
import { formatDateTime } from '~/shared/lib/time'

const editor = useEditorStore()
const { confirm } = useConfirm()

const newTodo = ref('')
const canAddTodo = computed(() => newTodo.value.trim().length > 0)

async function handleCancel(): Promise<void> {
  if (!editor.hasChanges) {
    editor.cancelEditing()
    await navigateTo('/')
    return
  }
  const ok = await confirm({
    title: 'Отменить редактирование?',
    message: 'Несохранённые изменения будут потеряны.',
    confirmLabel: 'Отменить',
    dismissLabel: 'Закрыть',
    danger: true,
  })
  if (!ok) return
  editor.cancelEditing()
  await navigateTo('/')
}

async function handleDelete(): Promise<void> {
  const ok = await confirm({
    title: 'Удалить заметку?',
    message: 'Заметка и все её задачи будут удалены без возможности восстановления.',
    confirmLabel: 'Удалить',
    dismissLabel: 'Отмена',
    danger: true,
  })
  if (!ok) return
  editor.deleteCurrent()
  await navigateTo('/')
}

function handleSave(): void {
  const wasCreate = editor.mode === 'create'
  const savedId = editor.save()
  if (wasCreate && savedId) navigateTo(`/notes/${savedId}`, { replace: true })
}

function handleAddTodo(): void {
  const text = newTodo.value.trim()
  if (!text) return
  editor.addTodo(text)
  newTodo.value = ''
}
</script>

<template>
  <div class="note-editor">
    <template v-if="editor.note">
      <div class="note-editor__toolbar">
        <UiButton variant="secondary" @click="handleCancel">Назад</UiButton>
        <div class="note-editor__spacer"></div>
        <UiButton variant="danger" @click="handleDelete">Удалить</UiButton>
        <UiButton variant="secondary" @click="handleCancel">Отменить редактирование</UiButton>
        <UiButton variant="primary" :disabled="!editor.hasChanges || editor.saving" @click="handleSave">
          Сохранить
        </UiButton>
      </div>

      <p
        class="note-editor__status"
        :class="{ 'note-editor__status--dirty': editor.hasChanges }"
        role="status"
      >
        <template v-if="editor.saving">Сохранение…</template>
        <template v-else-if="editor.hasChanges">Есть несохранённые изменения</template>
        <template v-else>Все изменения сохранены</template>
      </p>

      <UiTextInput
        v-model="editor.note.title"
        class="note-editor__title"
        label="Название"
        placeholder="Без названия"
        autocomplete="off"
        @focus="editor.onTitleFocus"
        @input="editor.onTitleInput"
        @blur="editor.onTitleBlur"
      />

      <section class="todo-block" aria-label="Задачи">
        <div class="todo-block__heading">
          <h2>Задачи</h2>
          <span class="todo-block__count">{{ editor.note.todos.length }}</span>
        </div>

        <TransitionGroup v-if="editor.note.todos.length" name="todo" tag="ul" class="todo-block__list">
          <li v-for="todo in editor.note.todos" :key="todo.id" class="todo-block__item">
            <UiCheckbox
              :model-value="todo.done"
              :label="'Выполнено'"
              @change="editor.toggleTodo(todo.id)"
            />
            <UiTextInput
              v-model="todo.text"
              class="todo-block__text"
              placeholder="Текст задачи"
              @focus="editor.onTodoFocus(todo.id)"
              @input="editor.onTodoInput"
              @blur="editor.onTodoBlur"
            />
            <UiButton
              variant="secondary"
              size="sm"
              aria-label="Удалить задачу"
              @click="editor.removeTodo(todo.id)"
            >Удалить</UiButton>
          </li>
        </TransitionGroup>
        <p v-else class="todo-block__empty">Задач пока нет — добавьте первую.</p>

        <form class="todo-block__add" @submit.prevent="handleAddTodo">
          <UiTextInput
            v-model="newTodo"
            class="todo-block__add-input"
            placeholder="Новая задача…"
            aria-label="Текст новой задачи"
          />
          <UiButton variant="primary" type="submit" :disabled="!canAddTodo">Добавить</UiButton>
        </form>
      </section>
    </template>

    <div v-else class="note-editor__loading">
      <UiSpinner />
    </div>

    <UiModal
      :open="editor.draftAvailable"
      size="sm"
      title="Найден черновик"
      :close-on-backdrop="false"
      :closable="false"
      @close="editor.discardDraft"
    >
      <p class="note-editor__modal-text">
        Несохранённый черновик этой заметки от
        <strong>{{ formatDateTime(editor.draftTimestamp) }}</strong>. Восстановить его?
      </p>
      <template #footer>
        <UiButton variant="secondary" @click="editor.discardDraft">Удалить черновик</UiButton>
        <UiButton variant="primary" data-ui-autofocus @click="editor.acceptDraft">Восстановить</UiButton>
      </template>
    </UiModal>

    <UiModal
      :open="editor.deletedExternally"
      size="sm"
      title="Заметка удалена в другом окне"
      :close-on-backdrop="false"
      :close-on-escape="false"
      :closable="false"
    >
      <p class="note-editor__modal-text">
        Эта заметка была удалена в другой вкладке. Вы можете сохранить свои изменения как новую заметку
        или отменить редактирование.
      </p>
      <template #footer>
        <UiButton variant="secondary" @click="editor.cancelEditing(); navigateTo('/')">
          Отменить редактирование
        </UiButton>
        <UiButton variant="primary" data-ui-autofocus @click="editor.save()">
          Сохранить как новую
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style lang="scss" scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__loading {
    display: flex;
    justify-content: center;
    padding: 64px 0;
  }

  &__toolbar {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);

    @media (min-width: 580px) {
      align-items: center;
      flex-direction: row;
    }
  }

  &__spacer {
    flex: 1;
    min-height: 16px;
  }

  &__status {
    margin: 0;
    font-size: 13px;
    color: var(--color-success);

    &--dirty {
      color: var(--color-text-muted);
    }
  }

  &__title {
    font-size: 20px;

    :deep(input) {
      font-size: 20px;
      font-weight: 700;
      padding: 14px 16px;
      min-height: 54px;
    }
  }

  &__modal-text {
    margin: 0;
  }
}

.todo-block {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__heading {
    display: flex;
    align-items: center;
    gap: 8px;

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 700;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition-fast);

    &:focus-within {
      border-color: var(--color-primary);
    }

    :deep(.ui-text__field) {
      min-height: 38px;
      padding: 8px 10px;
    }
  }

  &__text {
    flex: 1;
  }

  &__empty {
    margin: 0;
    padding: 24px 0;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  &__add {
    display: flex;
    gap: 10px;
    margin-top: 4px;

    &-input {
      flex: 1;
    }
  }
}

.todo-enter-active,
.todo-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.todo-enter-from,
.todo-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.todo-move {
  transition: transform 220ms ease;
}
</style>