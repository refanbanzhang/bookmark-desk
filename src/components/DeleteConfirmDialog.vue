<script setup>
import { t } from '../i18n'
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import BaseModal from './BaseModal.vue'

const { deletingNode, deletingKind, closeDeleteConfirm, confirmDelete } = useBookmarkActions()
</script>

<template>
  <BaseModal
    v-if="deletingNode"
    :title="t(deletingKind === 'folder' ? 'delete.titleFolder' : 'delete.titleBookmark')"
    :label="t(deletingKind === 'folder' ? 'delete.labelFolder' : 'delete.labelBookmark')"
    @close="closeDeleteConfirm"
  >
    <p class="modal__desc">
      {{
        t(deletingKind === 'folder' ? 'delete.bodyFolder' : 'delete.bodyBookmark', {
          name: deletingNode.title || t(deletingKind === 'folder' ? 'name.folder' : 'name.bookmark')
        })
      }}
      {{ t(hasChildren(deletingNode) ? 'delete.children' : 'delete.undo') }}
    </p>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeDeleteConfirm">{{ t('action.cancel') }}</button>
      <button class="btn btn--danger" type="button" @click="confirmDelete">{{ t('delete.confirm') }}</button>
    </template>
  </BaseModal>
</template>
