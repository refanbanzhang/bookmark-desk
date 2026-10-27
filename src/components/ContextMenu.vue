<script setup>
import { computed } from 'vue'
import { FolderPlus, KeyRound, Pencil, Trash2 } from 'lucide-vue-next'
import { t } from '../i18n'
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import { useContextMenu } from '../composables/useContextMenu'
import { useFolderAccess } from '../composables/useFolderAccess'

const { contextMenu, contextNode, contextScope, contextKind, contextMenuStyle, closeContextMenu } =
  useContextMenu()
const { openEdit, openDeleteConfirm, openCreate } = useBookmarkActions()
const { isProtected, openSet, openRemove } = useFolderAccess()

const caption = computed(() => {
  const node = contextNode.value
  if (!node) return ''
  const title = node.title || t('name.untitled')
  if (!node.url) return `${t(`kind.${contextKind.value}`)} · ${title}`
  let host = ''
  try {
    host = new URL(node.url).host
  } catch {
    host = ''
  }
  return host ? `${title} · ${host}` : title
})

const onCreateRoot = () => {
  openCreate(null, '')
  closeContextMenu()
}

const onCreateFolder = () => {
  if (!contextNode.value) return
  openCreate(contextNode.value.id, contextNode.value.title || t('name.folder'))
  closeContextMenu()
}

const onRename = () => {
  if (!contextNode.value) return
  openEdit(contextNode.value)
  closeContextMenu()
}

const onDelete = () => {
  if (!contextNode.value) return
  openDeleteConfirm(contextNode.value)
  closeContextMenu()
}

const onAccess = () => {
  if (!contextNode.value) return
  if (isProtected(contextNode.value)) {
    openSet(contextNode.value)
  } else {
    openSet(contextNode.value)
  }
  closeContextMenu()
}

const onRemoveAccess = () => {
  if (!contextNode.value) return
  openRemove(contextNode.value)
  closeContextMenu()
}
</script>

<template>
  <div
    v-if="contextMenu.visible && (contextScope === 'bar' || contextNode)"
    class="menu"
    :style="contextMenuStyle"
    role="menu"
    @click.stop
    @contextmenu.prevent
  >
    <template v-if="contextScope === 'bar'">
      <button class="menu__item" type="button" role="menuitem" @click="onCreateRoot">
        <FolderPlus :size="14" />
        {{ t('menu.newRoot') }}
      </button>
    </template>
    <template v-else>
      <p class="menu__cap">{{ caption }}</p>
      <button
        v-if="contextScope === 'tab'"
        class="menu__item"
        type="button"
        role="menuitem"
        @click="onCreateRoot"
      >
        <FolderPlus :size="14" />
        {{ t('menu.newRoot') }}
      </button>
      <button
        v-if="hasChildren(contextNode)"
        class="menu__item"
        type="button"
        role="menuitem"
        @click="onCreateFolder"
      >
        <FolderPlus :size="14" />
        {{ t('menu.newFolder') }}
      </button>
      <button class="menu__item" type="button" role="menuitem" @click="onRename">
        <Pencil :size="14" />
        {{ t(contextKind === 'folder' ? 'menu.renameFolder' : 'menu.renameBookmark') }}
      </button>
      <template v-if="hasChildren(contextNode)">
        <button class="menu__item" type="button" role="menuitem" @click="onAccess">
          <KeyRound :size="14" />
          {{ t(isProtected(contextNode) ? 'menu.changePassword' : 'menu.setPassword') }}
        </button>
        <button
          v-if="isProtected(contextNode)"
          class="menu__item"
          type="button"
          role="menuitem"
          @click="onRemoveAccess"
        >
          <KeyRound :size="14" />
          {{ t('menu.removePassword') }}
        </button>
      </template>
      <hr class="menu__sep" />
      <button class="menu__item menu__item--danger" type="button" role="menuitem" @click="onDelete">
        <Trash2 :size="14" />
        {{ t(contextKind === 'folder' ? 'menu.deleteFolder' : 'menu.deleteBookmark') }}
      </button>
    </template>
  </div>
</template>
