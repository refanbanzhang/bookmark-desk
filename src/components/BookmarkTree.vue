<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { hasChildren } from '../utils/bookmarkTree'
import { useBookmarkDrag, isCardHeadTarget, isRootFolderCardElement } from '../composables/useBookmarkDrag'
import { startDragPreview } from '../utils/dragPreview'
import { isFolderCenterDropTarget } from '../utils/folderDropZone'
import { useFolderAccess } from '../composables/useFolderAccess'
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
  },
  sortable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['open-folder'])

const {
  activeDropFolderId,
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
const isSubfolderGrid = computed(() => Boolean(parentIdValue.value))

const isFolder = (node) => hasChildren(node)
const isRootFolder = (node) => props.depth === 0 && isFolder(node)
const { isProtected, isUnlocked } = useFolderAccess()
const canShowChildren = (node) => !isProtected(node) || isUnlocked(node)

/* 顶层整屏都是散落书签时，格子按磁贴内容收紧，不必跟着目录卡留三行高度 */
const isTileGrid = computed(
  () => props.depth === 0 && props.nodes.length > 0 && props.nodes.every((node) => !hasChildren(node))
)

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

  if (
    !isFolderCenterDropTarget({
      element: folderTarget,
      clientX: point.clientX,
      clientY: point.clientY,
      isCurrentTarget: activeDropFolderId.value === folderId
    })
  ) {
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
  if (import.meta.env.DEV) {
    const item = event?.item
    const module = item?.querySelector?.('.module--folder-card')
    console.debug('[BookmarkTree] drag start', {
      nodeId: item?.dataset?.nodeId || '',
      itemClass: item?.className || '',
      moduleRadius: module ? getComputedStyle(module).borderRadius : ''
    })
  }
  handleBookmarkDragStart(
    String(event?.item?.dataset.nodeId || ''),
    isRootFolderCardElement(event.item)
  )
  handleFolderDragTargetChange(null)
}

/** SortableJS 的 start 是 setTimeout 之后的异步事件，赶不上原生 dragstart，预览得挂在这 */
const onNativeDragStart = (event) => {
  const item = event.target
  if (!item?.classList?.contains('bookmark-item') || item.parentElement !== event.currentTarget) {
    return
  }
  startDragPreview(item, event)
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
    :class="[depthClass, { 'is-tile-grid': isTileGrid, 'is-subfolder-grid': isSubfolderGrid }]"
    :model-value="nodes"
    :data-group-parent-id="parentIdValue"
    draggable="li.bookmark-item"
    ghost-class="row--ghost"
    chosen-class="row--chosen"
    drag-class="row--drag"
    handle=".drag-handle"
    :animation="0"
    :disabled="!sortable"
    :group="{ name: 'bookmark-tree', pull: sortable, put: sortable }"
    :move="onMove"
    @start="onDragStart"
    @end="onDragEnd"
    @dragstart="onNativeDragStart"
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
        @open-folder="emit('open-folder', $event)"
      />

      <template v-else>
        <BookmarkRow :node="node" />
        <BookmarkTree
          v-if="isFolder(node) && canShowChildren(node)"
          :nodes="node.children"
          :parent-id="node.id"
          :depth="depth + 1"
        />
      </template>
    </li>
  </VueDraggable>
</template>
