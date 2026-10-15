<script setup>
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import BaseModal from './BaseModal.vue'

const { deletingNode, deletingKind, closeDeleteConfirm, confirmDelete } = useBookmarkActions()
</script>

<template>
  <BaseModal
    v-if="deletingNode"
    :title="`确认删除${deletingKind}`"
    :label="`删除${deletingKind}`"
    @close="closeDeleteConfirm"
  >
    <p class="modal__desc">
      将删除{{ deletingKind }}「{{ deletingNode.title || `未命名${deletingKind}` }}」。
      {{ hasChildren(deletingNode) ? '此操作会同时删除其下全部内容。' : '此操作不可撤销。' }}
    </p>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeDeleteConfirm">取消</button>
      <button class="btn btn--danger" type="button" @click="confirmDelete">确认删除</button>
    </template>
  </BaseModal>
</template>
