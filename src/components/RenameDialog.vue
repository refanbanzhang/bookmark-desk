<script setup>
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
    :title="`重命名${editingKind}`"
    :label="`重命名${editingKind}`"
    @close="closeEdit"
  >
    <p class="modal__desc">{{ editingNode.title || `未命名${editingKind}` }}</p>

    <label class="field">
      <span class="field__label">名称</span>
      <input
        ref="editInputRef"
        v-model="editingTitle"
        class="field__input"
        type="text"
        spellcheck="false"
        @keydown.enter.prevent="saveEdit"
      />
      <em v-if="editError" class="field__error">{{ editError }}</em>
    </label>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeEdit">取消</button>
      <button class="btn btn--primary" type="button" @click="saveEdit">保存</button>
    </template>
  </BaseModal>
</template>
