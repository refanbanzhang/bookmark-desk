<script setup>
import { computed } from 'vue'
import { Folder, GripVertical } from 'lucide-vue-next'
import { isBookmarkDragActive, useBookmarkDrag } from '../composables/useBookmarkDrag'
import { useContextMenu } from '../composables/useContextMenu'
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

const folderId = computed(() => String(props.node.id))
const title = computed(() => props.node.title || '未命名目录')
const children = computed(() => props.node.children || [])
const isDropTarget = computed(() => String(activeDropFolderId.value || '') === folderId.value)

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
      <Folder class="module__icon" :size="16" />
      <h4 class="module__title">{{ title }}</h4>
    </div>

    <div class="module__rule" aria-hidden="true"></div>

    <div class="module__body">
      <BookmarkTree :nodes="children" :parent-id="node.id" :depth="depth" />
    </div>
  </section>
</template>
