<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkDrag, isCardHeadTarget, isRootFolderCardElement } from '../composables/useBookmarkDrag'
import BookmarkRow from './BookmarkRow.vue'
import BookmarkModule from './BookmarkModule.vue'

defineOptions({ name: 'BookmarkTree' })

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  parentId: {
    type: [String, Number],
    default: null
  },
  depth: {
    type: Number,
    default: 0
  }
})

const {
  dragSourceIsCard,
  canMoveNode,
  getGlobalDragCount,
  setGlobalDragCount,
  handleBookmarkDragStart,
  handleFolderDragTargetChange,
  handleDragEnd
} = useBookmarkDrag()

const groupRef = ref(null)
const isLocalDragging = ref(false)

const depthClass = computed(() => `depth-${props.depth || 0}`)
const parentIdValue = computed(() =>
  props.parentId === null || props.parentId === undefined || props.parentId === ''
    ? ''
    : String(props.parentId)
)

const isFolder = (node) => hasChildren(node)
const isRootFolder = (node) => props.depth === 0 && isFolder(node)

const getClientPoint = (event) => {
  const source = event?.touches?.[0] || event?.changedTouches?.[0] || event
  const clientX = Number(source?.clientX)
  const clientY = Number(source?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null
  }
  return { clientX, clientY }
}

/** 指针当前悬停的目录（用于「拖进目录」而非「插入列表」） */
const getFolderTargetId = (originalEvent, draggedId) => {
  const point = getClientPoint(originalEvent)
  if (!point || typeof document === 'undefined') {
    return null
  }

  const hoveredElement = document.elementFromPoint(point.clientX, point.clientY)
  const folderTarget = hoveredElement?.closest?.('[data-folder-drop-id]')
  /* 拖动目录卡片时忽略卡片标题栏，否则「移入」永远抢在换位前面 */
  if (dragSourceIsCard.value && isCardHeadTarget(folderTarget)) {
    return null
  }
  const folderId = String(folderTarget?.dataset.folderDropId || '')
  if (!folderId || folderId === String(draggedId)) {
    return null
  }

  return folderId
}

const onMove = (event, originalEvent) => {
  const draggedId = String(event.dragged?.dataset.nodeId || '')
  if (!draggedId) {
    handleFolderDragTargetChange(null)
    return true
  }

  const folderTargetId = getFolderTargetId(originalEvent, draggedId)
  if (folderTargetId) {
    handleFolderDragTargetChange(canMoveNode(draggedId, folderTargetId) ? folderTargetId : null)
    return false
  }

  const targetParentId = event.to?.dataset.groupParentId || ''
  if (!canMoveNode(draggedId, targetParentId || null)) {
    handleFolderDragTargetChange(null)
    return false
  }

  handleFolderDragTargetChange(null)
  return true
}

const onDragStart = (event) => {
  if (!isLocalDragging.value) {
    isLocalDragging.value = true
    setGlobalDragCount(getGlobalDragCount() + 1)
  }
  handleBookmarkDragStart(
    String(event?.item?.dataset.nodeId || ''),
    isRootFolderCardElement(event.item)
  )
  handleFolderDragTargetChange(null)
}

const onDragEnd = (event) => {
  if (isLocalDragging.value) {
    isLocalDragging.value = false
    setGlobalDragCount(getGlobalDragCount() - 1)
  }
  handleFolderDragTargetChange(null)
  handleDragEnd(event)
}

onUnmounted(() => {
  if (isLocalDragging.value) {
    isLocalDragging.value = false
    setGlobalDragCount(getGlobalDragCount() - 1)
  }
})
</script>

<template>
  <VueDraggable
    ref="groupRef"
    tag="ul"
    class="group"
    :class="depthClass"
    :model-value="nodes"
    :data-group-parent-id="parentIdValue"
    draggable="li.bookmark-item"
    ghost-class="row--ghost"
    chosen-class="row--chosen"
    drag-class="row--drag"
    handle=".drag-handle"
    :animation="0"
    :group="{ name: 'bookmark-tree', pull: true, put: true }"
    :move="onMove"
    @start="onDragStart"
    @end="onDragEnd"
  >
    <li
      v-for="node in nodes"
      :key="node.id"
      class="bookmark-item"
      :class="{
        'is-folder': isFolder(node),
        'is-root-folder': isRootFolder(node),
        'is-tile': !isFolder(node)
      }"
      :data-id="String(node.id)"
      :data-node-id="String(node.id)"
    >
      <BookmarkModule
        v-if="isRootFolder(node)"
        :node="node"
        :depth="depth + 1"
      />

      <template v-else>
        <BookmarkRow :node="node" />
        <BookmarkTree
          v-if="isFolder(node)"
          :nodes="node.children"
          :parent-id="node.id"
          :depth="depth + 1"
        />
      </template>
    </li>
  </VueDraggable>
</template>
