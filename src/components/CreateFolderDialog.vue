<script setup>
import { t, text } from '../i18n'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import { useBookmarkSearch } from '../composables/useBookmarkSearch'
import { useBookmarkTabs } from '../composables/useBookmarkTabs'
import BaseModal from './BaseModal.vue'

const {
  creating,
  createParentId,
  createParentTitle,
  createTitle,
  createError,
  createInputRef,
  closeCreate,
  saveCreate
} = useBookmarkActions()
const { clearQuery } = useBookmarkSearch()
const { visibleParentId, revealFolder, switchTab } = useBookmarkTabs()

const onSave = async () => {
  const parentId = createParentId.value
  const folder = await saveCreate()
  if (!folder) {
    return
  }

  clearQuery()
  if (!parentId) {
    switchTab(String(folder.id))
    return
  }
  if (String(parentId) !== String(visibleParentId.value || '')) {
    revealFolder(parentId)
  }
}
</script>

<template>
  <BaseModal v-if="creating" :title="t('create.title')" :label="t('create.title')" @close="closeCreate">
    <p class="modal__desc">{{ t('create.in', { name: createParentTitle || t('name.bar') }) }}</p>

    <label class="field">
      <span class="field__label">{{ t('field.name') }}</span>
      <input
        ref="createInputRef"
        v-model="createTitle"
        class="field__input"
        type="text"
        spellcheck="false"
        @keydown.enter.prevent="onSave"
      />
      <em v-if="createError" class="field__error">{{ text(createError) }}</em>
    </label>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeCreate">{{ t('action.cancel') }}</button>
      <button class="btn btn--primary" type="button" @click="onSave">{{ t('create.action') }}</button>
    </template>
  </BaseModal>
</template>
