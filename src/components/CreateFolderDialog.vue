<script setup>
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
  <BaseModal v-if="creating" title="新建目录" label="新建目录" @close="closeCreate">
    <p class="modal__desc">创建在「{{ createParentTitle || '书签栏' }}」</p>

    <label class="field">
      <span class="field__label">名称</span>
      <input
        ref="createInputRef"
        v-model="createTitle"
        class="field__input"
        type="text"
        spellcheck="false"
        @keydown.enter.prevent="onSave"
      />
      <em v-if="createError" class="field__error">{{ createError }}</em>
    </label>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeCreate">取消</button>
      <button class="btn btn--primary" type="button" @click="onSave">创建</button>
    </template>
  </BaseModal>
</template>
