<script setup>
import { t, text } from '../i18n'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import BaseModal from './BaseModal.vue'

const {
  editingNode,
  editingTitle,
  editingKind,
  editError,
  editInputRef,
  closeEdit,
  saveEdit
} = useBookmarkActions()
</script>

<template>
  <BaseModal
    v-if="editingNode"
    :title="t(editingKind === 'folder' ? 'rename.titleFolder' : 'rename.titleBookmark')"
    :label="t(editingKind === 'folder' ? 'rename.titleFolder' : 'rename.titleBookmark')"
    @close="closeEdit"
  >
    <p class="modal__desc">{{ editingNode.title || t(editingKind === 'folder' ? 'name.folder' : 'name.bookmark') }}</p>

    <label class="field">
      <span class="field__label">{{ t('field.name') }}</span>
      <input
        ref="editInputRef"
        v-model="editingTitle"
        class="field__input"
        type="text"
        spellcheck="false"
        @keydown.enter.prevent="saveEdit"
      />
      <em v-if="editError" class="field__error">{{ text(editError) }}</em>
    </label>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeEdit">{{ t('action.cancel') }}</button>
      <button class="btn btn--primary" type="button" @click="saveEdit">{{ t('action.save') }}</button>
    </template>
  </BaseModal>
</template>
