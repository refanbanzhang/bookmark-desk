<script setup>
import { computed } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import { useContextMenu } from '../composables/useContextMenu'

const { contextNode, contextKind, contextMenuStyle, closeContextMenu } = useContextMenu()
const { openEdit, openDeleteConfirm } = useBookmarkActions()

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
    <hr class="menu__sep" />
    <button class="menu__item menu__item--danger" type="button" role="menuitem" @click="onDelete">
      <Trash2 :size="14" />
      删除{{ contextKind }}
    </button>
  </div>
</template>
