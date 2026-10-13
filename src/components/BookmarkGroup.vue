<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ExternalLink, Folder, GripVertical } from 'lucide-vue-next'
import { VueDraggable } from 'vue-draggable-plus'

defineOptions({ name: 'BookmarkGroup' })

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
  canAnimate: {
    type: Boolean,
    default: true
  },
  activeDropFolderId: {
    type: [String, Number],
    default: ''
  },
  canMove: {
    type: Function,
    default: null
  }
})

const emit = defineEmits([
  'drag-start',
  'drag-end',
  'drag-target-change',
  'open-bookmark',
  'open-context-menu'
])

const groupRef = ref(null)
const isLocalDragging = ref(false)
const depthClass = computed(() => `depth-${props.depth || 0}`)
const parentIdValue = computed(() =>
  props.parentId === null || props.parentId === undefined || props.parentId === ''
    ? ''
    : String(props.parentId)
)

const hasChildren = (node) => Array.isArray(node?.children)
const isRootFolder = (node) => props.depth === 0 && hasChildren(node)
const getHost = (url) => {
  if (!url) return ''
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const onContextMenu = (node, event) => {
  event.preventDefault()
  event.stopPropagation()
  emit('open-context-menu', node, { x: event.clientX, y: event.clientY })
}

const onContentClick = (node, event) => {
  if (!node?.url || event.target.closest('a')) {
    return
  }
  emit('open-bookmark', node.url, { background: false })
}

const onContentAuxClick = (node, event) => {
  if (!node?.url || event.button !== 1 || event.target.closest('a')) {
    return
  }

  event.preventDefault()
  emit('open-bookmark', node.url, { background: true })
}

const getClientPoint = (event) => {
  const source = event?.touches?.[0] || event?.changedTouches?.[0] || event
  const clientX = Number(source?.clientX)
  const clientY = Number(source?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null
  }

  return { clientX, clientY }
}

const getFolderTargetId = (originalEvent, draggedId) => {
  const point = getClientPoint(originalEvent)
  if (!point || typeof document === 'undefined') {
    return null
  }

  const hoveredElement = document.elementFromPoint(point.clientX, point.clientY)
  const folderTarget = hoveredElement?.closest?.('[data-folder-drop-id]')
  const folderId = String(folderTarget?.dataset.folderDropId || '')
  if (!folderId || folderId === String(draggedId)) {
    return null
  }

  return folderId
}

const onFolderDragOver = (node, event) => {
  if (!hasChildren(node) || !isAnyDragInProgress()) {
    return
  }

  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  emit('drag-target-change', String(node.id))
}

const onFolderDragLeave = (event) => {
  if (event.currentTarget?.contains?.(event.relatedTarget)) {
    return
  }
  emit('drag-target-change', null)
}

const onMove = (event, originalEvent) => {
  const draggedId = String(event.dragged?.dataset.nodeId || '')
  if (!draggedId || !props.canMove) {
    emit('drag-target-change', null)
    return true
  }

  const folderTargetId = getFolderTargetId(originalEvent, draggedId)
  if (folderTargetId) {
    emit('drag-target-change', props.canMove(draggedId, folderTargetId) ? folderTargetId : null)
    return false
  }

  const targetParentId = event.to?.dataset.groupParentId || ''
  if (!props.canMove(draggedId, targetParentId || null)) {
    emit('drag-target-change', null)
    return false
  }

  emit('drag-target-change', null)
  return true
}

const getGlobalDragCount = () => {
  if (typeof window === 'undefined') return 0
  return Number(window.__bookmarkDragCount || 0)
}

const setGlobalDragCount = (nextCount) => {
  if (typeof window === 'undefined') return
  const safeCount = Math.max(0, Number(nextCount) || 0)
  window.__bookmarkDragCount = safeCount
  if (safeCount > 0) {
    document.documentElement.dataset.bookmarkDragging = 'true'
    return
  }
  delete document.documentElement.dataset.bookmarkDragging
}

const isAnyDragInProgress = () => document.documentElement.dataset.bookmarkDragging === 'true'

const clearHoverAnimationTargets = () => {
  const targets = groupRef.value?.$el?.querySelectorAll?.('.bookmark-content, .bookmark-text')
  if (!targets?.length) {
    return
  }
  const items = Array.from(targets)
  gsap.killTweensOf(items)
  gsap.set(items, {
    clearProps: 'transform,opacity,visibility'
  })
}

const onDragStart = (event) => {
  if (!isLocalDragging.value) {
    isLocalDragging.value = true
    setGlobalDragCount(getGlobalDragCount() + 1)
  }
  emit('drag-start', String(event?.item?.dataset.nodeId || ''))
  emit('drag-target-change', null)
  clearHoverAnimationTargets()
}

const onDragEnd = (event) => {
  if (isLocalDragging.value) {
    isLocalDragging.value = false
    setGlobalDragCount(getGlobalDragCount() - 1)
  }
  emit('drag-target-change', null)
  clearHoverAnimationTargets()
  emit('drag-end', event)
}

const getRootCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const omitMotionProps = (vars) => {
  const nextVars = { ...vars }
  delete nextVars.x
  delete nextVars.y
  delete nextVars.scale
  return nextVars
}

const shouldAnimate = () => props.canAnimate

const rememberHoverBase = (element) => {
  if (!element) {
    return null
  }

  const styles = window.getComputedStyle(element)
  const base = {
    borderColor: styles.borderColor,
    boxShadow: styles.boxShadow === 'none' ? '0 0 0 rgba(0, 0, 0, 0)' : styles.boxShadow,
    backgroundColor: styles.backgroundColor
  }

  element.__gsapHoverBase = base
  return base
}

const onBookmarkHoverEnter = (event) => {
  const element = event.currentTarget
  if (!element || isAnyDragInProgress()) {
    return
  }

  const text = element.querySelector('.bookmark-text')

  rememberHoverBase(element)

  gsap.killTweensOf([element, text].filter(Boolean))

  const elementHoverVars = {
    y: -3,
    boxShadow: getRootCssVar('--bookmark-hover-shadow'),
    duration: 0.22,
    ease: 'power2.out',
    overwrite: 'auto'
  }

  if (text) {
    const textHoverVars = {
      x: 2,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto'
    }

    if (!shouldAnimate()) {
      gsap.set(text, omitMotionProps(textHoverVars))
    } else {
      gsap.to(text, textHoverVars)
    }
  }

  if (!shouldAnimate()) {
    gsap.set(element, omitMotionProps(elementHoverVars))
    return
  }

  gsap.to(element, elementHoverVars)
}

const onBookmarkHoverLeave = (event) => {
  const element = event.currentTarget
  if (!element || isAnyDragInProgress()) {
    return
  }

  const text = element.querySelector('.bookmark-text')
  const base = element.__gsapHoverBase || rememberHoverBase(element)

  gsap.killTweensOf([element, text].filter(Boolean))

  const elementLeaveVars = {
    y: 0,
    boxShadow: base?.boxShadow,
    backgroundColor: base?.backgroundColor,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  }

  if (text) {
    const textLeaveVars = {
      x: 0,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform'
    }

    if (!shouldAnimate()) {
      gsap.set(text, omitMotionProps(textLeaveVars))
    } else {
      gsap.to(text, textLeaveVars)
    }
  }

  if (!shouldAnimate()) {
    gsap.set(element, omitMotionProps(elementLeaveVars))
    return
  }

  gsap.to(element, elementLeaveVars)
}

onUnmounted(() => {
  if (isLocalDragging.value) {
    isLocalDragging.value = false
    setGlobalDragCount(getGlobalDragCount() - 1)
  }
  const targets = groupRef.value?.$el?.querySelectorAll?.('.bookmark-content, .bookmark-text')
  if (!targets?.length) {
    return
  }
  gsap.killTweensOf(Array.from(targets))
})

const forwardDragTargetChange = (folderId) => emit('drag-target-change', folderId)
const forwardDragStart = (nodeId) => emit('drag-start', nodeId)
const forwardOpenContextMenu = (node, point) => emit('open-context-menu', node, point)
const forwardOpenBookmark = (url, options) => emit('open-bookmark', url, options)
const forwardDragEnd = (event) => emit('drag-end', event)
</script>

<template>
  <VueDraggable
    ref="groupRef"
    tag="ul"
    class="bookmark-group"
    :class="depthClass"
    :model-value="nodes"
    :animation="0"
    :data-group-parent-id="parentIdValue"
    draggable="li.bookmark-item"
    ghost-class="bookmark-sort-ghost"
    chosen-class="bookmark-sort-chosen"
    drag-class="bookmark-sort-drag"
    handle=".drag-handle"
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
        'is-folder': hasChildren(node),
        'is-root-folder': isRootFolder(node)
      }"
      :data-id="String(node.id)"
      :data-node-id="String(node.id)"
    >
      <section
        v-if="isRootFolder(node)"
        class="module-section folder"
        :class="{ 'is-drop-target': String(activeDropFolderId || '') === String(node.id) }"
      >
        <div
          class="module-header-title module-folder-title drag-handle"
          :data-folder-drop-id="String(node.id)"
          @contextmenu.prevent.stop="onContextMenu(node, $event)"
          @dragover="onFolderDragOver(node, $event)"
          @dragleave="onFolderDragLeave"
        >
          <Folder :size="17" aria-hidden="true" />
          <span>{{ node.title || '未命名目录' }}</span>
        </div>
        <div class="module-body">
          <BookmarkGroup
            :nodes="node.children"
            :parent-id="node.id"
            :depth="depth + 1"
            :can-animate="canAnimate"
            :active-drop-folder-id="activeDropFolderId"
            :can-move="canMove"
            @drag-start="forwardDragStart"
            @drag-end="forwardDragEnd"
            @drag-target-change="forwardDragTargetChange"
            @open-bookmark="forwardOpenBookmark"
            @open-context-menu="forwardOpenContextMenu"
          />
        </div>
      </section>

      <div v-else class="bookmark-row" :class="{ folder: hasChildren(node) }">
        <div
          class="bookmark-content drag-handle"
          :data-folder-drop-id="hasChildren(node) ? String(node.id) : null"
          :class="{
            'is-drop-target': hasChildren(node) && String(activeDropFolderId || '') === String(node.id)
          }"
          @click="onContentClick(node, $event)"
          @auxclick="onContentAuxClick(node, $event)"
          @contextmenu="onContextMenu(node, $event)"
          @dragover="hasChildren(node) && onFolderDragOver(node, $event)"
          @dragleave="hasChildren(node) && onFolderDragLeave($event)"
          @mouseenter="onBookmarkHoverEnter"
          @mouseleave="onBookmarkHoverLeave"
        >
          <div class="bookmark-text">
            <a v-if="node.url" :href="node.url" target="_blank" rel="noreferrer" draggable="false" @click.stop>
              {{ node.title || '未命名书签' }}
            </a>
            <span v-if="node.url" class="bookmark-host">{{ getHost(node.url) }}</span>
            <span v-else>{{ node.title || '未命名目录' }}</span>
          </div>
          <span v-if="node.url" class="bookmark-open-icon" aria-hidden="true">
            <ExternalLink :size="14" />
          </span>
          <span class="drag-indicator" aria-hidden="true">
            <GripVertical :size="15" />
          </span>
        </div>
      </div>

        <BookmarkGroup
        v-if="!isRootFolder(node) && hasChildren(node)"
        :nodes="node.children"
        :parent-id="node.id"
        :depth="depth + 1"
        :can-animate="canAnimate"
        :active-drop-folder-id="activeDropFolderId"
        :can-move="canMove"
        @drag-start="forwardDragStart"
        @drag-end="forwardDragEnd"
        @drag-target-change="forwardDragTargetChange"
        @open-bookmark="forwardOpenBookmark"
        @open-context-menu="forwardOpenContextMenu"
      />
    </li>
  </VueDraggable>
</template>

<style scoped>
.bookmark-group {
  --bookmark-card-gap: 10px;
  --bookmark-card-width: calc((100% - (var(--bookmark-card-gap) * 4)) / 5);
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  row-gap: 8px;
  column-gap: var(--bookmark-card-gap);
}

.bookmark-item {
  list-style: none;
}

.bookmark-item.is-root-folder {
  width: 100%;
}

.bookmark-item:not(.is-root-folder) {
  flex: 0 0 auto;
  width: var(--bookmark-card-width);
}

.bookmark-row {
  position: relative;
}

.bookmark-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  background: var(--bookmark-card-bg);
  border: 1px solid var(--bookmark-card-border);
  border-radius: var(--bookmark-card-radius, var(--radius-base));
  width: 100%;
  flex-shrink: 0;
  padding: 12px;
  box-shadow: var(--bookmark-card-shadow);
  cursor: grab;
  touch-action: none;
  backdrop-filter: var(--bookmark-card-backdrop-filter, none);
  -webkit-backdrop-filter: var(--bookmark-card-backdrop-filter, none);
  will-change: transform, box-shadow, backdrop-filter;
}

.bookmark-row.folder .bookmark-content {
  background: var(--folder-card-bg);
  border-color: var(--folder-card-border);
}

.bookmark-row.folder .bookmark-content.is-drop-target {
  border-color: color-mix(in srgb, var(--accent) 58%, white);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent),
    0 16px 36px rgba(37, 99, 235, 0.16);
}

.bookmark-text {
  min-width: 0;
  width: 100%;
}

.bookmark-text > a,
.bookmark-text > span:not(.bookmark-host) {
  display: block;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.2;
  color: var(--bookmark-text);
  text-decoration: none;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.bookmark-text > a + span {
  margin-top: 2px;
}

.bookmark-host {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 400;
  color: var(--bookmark-host-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-text a:hover {
  color: var(--bookmark-link-hover);
}

.bookmark-row.folder .bookmark-text > span:first-child {
  color: var(--folder-title-text);
  overflow: visible;
  display: block;
  white-space: normal;
  -webkit-line-clamp: unset;
}

.bookmark-sort-chosen .bookmark-content,
.bookmark-sort-drag .bookmark-content {
  border-style: dashed;
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: none;
  background: var(--bookmark-card-bg);
}

.bookmark-sort-chosen.module-section,
.bookmark-sort-drag.module-section {
  outline: 2px dashed rgba(37, 99, 235, 0.42);
  outline-offset: 6px;
  box-shadow: none;
}

.bookmark-sort-chosen .bookmark-row.folder .bookmark-content,
.bookmark-sort-drag .bookmark-row.folder .bookmark-content {
  background: var(--folder-card-bg);
  border-color: rgba(37, 99, 235, 0.42);
}

@media (max-width: 768px) {
  .bookmark-group {
    --bookmark-card-gap: 8px;
    --bookmark-card-width: calc((100% - var(--bookmark-card-gap)) / 2);
  }

  .bookmark-content {
    padding: 10px;
  }

  .bookmark-text > a,
  .bookmark-text > span:not(.bookmark-host) {
    font-size: 12px;
  }
}

/* Keep the recursive list visually aligned with the shared shadcn-style tokens. */
.bookmark-group {
  --bookmark-card-gap: 12px;
  --bookmark-card-width: calc((100% - (var(--bookmark-card-gap) * 4)) / 5);
  row-gap: 12px;
}

.bookmark-content {
  padding: 14px;
  border-radius: var(--bookmark-card-radius, 10px);
  box-shadow: var(--bookmark-card-shadow);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.bookmark-content:hover {
  border-color: var(--bookmark-hover-border);
  box-shadow: var(--bookmark-hover-shadow);
}

.bookmark-text {
  position: relative;
  padding-right: 18px;
}

.bookmark-text > a,
.bookmark-text > span:not(.bookmark-host) {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
}

.bookmark-host {
  font-size: 11px;
}

.bookmark-open-icon,
.drag-indicator {
  position: absolute;
  display: inline-flex;
  color: var(--muted);
  opacity: 0;
  transition: opacity 150ms ease, color 150ms ease;
}

.bookmark-open-icon {
  right: 12px;
  top: 12px;
}

.drag-indicator {
  right: 10px;
  bottom: 10px;
  cursor: grab;
}

.bookmark-content:hover .bookmark-open-icon,
.bookmark-content:hover .drag-indicator,
.bookmark-content:focus-within .bookmark-open-icon {
  opacity: 1;
}

.bookmark-open-icon:hover {
  color: var(--text);
}

.bookmark-row.folder .bookmark-content {
  background: var(--folder-card-bg);
}

.bookmark-row.folder .bookmark-content.is-drop-target {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 14%, transparent);
}

.module-section.is-drop-target {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.bookmark-sort-chosen .bookmark-content,
.bookmark-sort-drag .bookmark-content {
  border-style: dashed;
  border-color: var(--accent);
  box-shadow: none;
}

@media (max-width: 768px) {
  .bookmark-group {
    --bookmark-card-gap: 8px;
    --bookmark-card-width: calc((100% - var(--bookmark-card-gap)) / 2);
  }
}
</style>
