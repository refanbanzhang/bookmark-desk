<script setup>
import { computed } from 'vue'
import { Folder, GripVertical, LockKeyhole, UnlockKeyhole } from 'lucide-vue-next'
import { isBookmarkDragActive, useBookmarkDrag } from '../composables/useBookmarkDrag'
import { useContextMenu } from '../composables/useContextMenu'
import { useFolderAccess } from '../composables/useFolderAccess'
import BookmarkTree from './BookmarkTree.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 1
  }
})

const { activeDropFolderId, handleFolderDragTargetChange } = useBookmarkDrag()
const { openContextMenu } = useContextMenu()
const { isProtected, isUnlocked, requestAccess } = useFolderAccess()

const folderId = computed(() => String(props.node.id))
const title = computed(() => props.node.title || '未命名目录')
const children = computed(() => props.node.children || [])
const isDropTarget = computed(() => String(activeDropFolderId.value || '') === folderId.value)
const isLocked = computed(() => isProtected(props.node) && !isUnlocked(props.node))

const onContextMenu = (event) => {
  event.preventDefault()
  event.stopPropagation()
  openContextMenu(props.node, { x: event.clientX, y: event.clientY })
}

const onDragOver = (event) => {
  if (!isBookmarkDragActive()) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  handleFolderDragTargetChange(folderId.value, { fromCardHead: true })
}

const onDragLeave = (event) => {
  if (event.currentTarget?.contains?.(event.relatedTarget)) {
    return
  }
  handleFolderDragTargetChange(null)
}

const unlock = () => {
  requestAccess(props.node)
}
</script>

<template>
  <section class="module" :class="{ 'module--drop': isDropTarget }">
    <div
      class="module__head drag-handle"
      :data-folder-drop-id="folderId"
      @contextmenu="onContextMenu"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <GripVertical class="module__grip" :size="14" />
      <LockKeyhole v-if="isLocked" class="module__icon" :size="16" />
      <Folder v-else class="module__icon" :size="16" />
      <h4 class="module__title">{{ title }}</h4>
    </div>

    <div class="module__rule" aria-hidden="true"></div>

    <div v-if="isLocked" class="module__locked">
      <LockKeyhole :size="18" />
      <span>该目录已加密</span>
      <button class="btn btn--ghost" type="button" @click="unlock">
        <UnlockKeyhole :size="14" />
        输入密码
      </button>
    </div>
    <div v-else class="module__body">
      <BookmarkTree :nodes="children" :parent-id="node.id" :depth="depth" />
    </div>
  </section>
</template>
