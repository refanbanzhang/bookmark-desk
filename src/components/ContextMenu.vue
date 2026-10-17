<script setup>
import { computed } from 'vue'
import { KeyRound, Pencil, Trash2 } from 'lucide-vue-next'
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import { useContextMenu } from '../composables/useContextMenu'
import { useFolderAccess } from '../composables/useFolderAccess'

const { contextNode, contextKind, contextMenuStyle, closeContextMenu } = useContextMenu()
const { openEdit, openDeleteConfirm } = useBookmarkActions()
const { isProtected, openSet, openRemove } = useFolderAccess()

const caption = computed(() => {
  const node = contextNode.value
  if (!node) return ''
  const title = node.title || '未命名'
  if (!node.url) return `${contextKind.value} · ${title}`
  let host = ''
  try {
    host = new URL(node.url).host
  } catch {
    host = ''
  }
  return host ? `${title} · ${host}` : title
})

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
    v-if="contextNode"
    class="menu"
    :style="contextMenuStyle"
    role="menu"
    @click.stop
  >
    <p class="menu__cap">{{ caption }}</p>
    <button class="menu__item" type="button" role="menuitem" @click="onRename">
      <Pencil :size="14" />
      重命名{{ contextKind }}
    </button>
    <template v-if="hasChildren(contextNode)">
      <button class="menu__item" type="button" role="menuitem" @click="onAccess">
        <KeyRound :size="14" />
        {{ isProtected(contextNode) ? '修改访问密码' : '设置访问密码' }}
      </button>
      <button
        v-if="isProtected(contextNode)"
        class="menu__item"
        type="button"
        role="menuitem"
        @click="onRemoveAccess"
      >
        <KeyRound :size="14" />
        移除访问密码
      </button>
    </template>
    <hr class="menu__sep" />
    <button class="menu__item menu__item--danger" type="button" role="menuitem" @click="onDelete">
      <Trash2 :size="14" />
      删除{{ contextKind }}
    </button>
  </div>
</template>
