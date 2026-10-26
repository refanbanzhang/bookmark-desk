<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ExternalLink, GripVertical, LockKeyhole } from 'lucide-vue-next'
import { hasChildren } from '../utils/bookmarkTree'
import { getFaviconUrl } from '../utils/favicon'
import { isBookmarkDragActive, useBookmarkDrag } from '../composables/useBookmarkDrag'
import { useContextMenu } from '../composables/useContextMenu'
import { openBookmarkUrl } from '../composables/useChromeBookmarks'
import { useRecentVisits } from '../composables/useRecentVisits'
import { useFolderAccess } from '../composables/useFolderAccess'
import { isFolderCenterDropTarget } from '../utils/folderDropZone'

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
})

const { activeDropFolderId, handleFolderDragTargetChange } = useBookmarkDrag()
const { openContextMenu } = useContextMenu()
const { requestAccess, isProtected, isUnlocked } = useFolderAccess()
const { recordVisit } = useRecentVisits()

const isFolder = computed(() => hasChildren(props.node))
const host = computed(() => {
  if (!props.node.url) return ''
  try {
    return new URL(props.node.url).host.replace(/^www\./, '')
  } catch {
    return ''
  }
})
const mark = computed(() => {
  const title = (props.node.title || '').trim()
  return title ? title.slice(0, 2).toUpperCase() : '·'
})
const favicon = computed(() => (isFolder.value ? '' : getFaviconUrl(props.node.url)))
const faviconFailed = ref(false)

watch(
  () => props.node.url,
  () => {
    faviconFailed.value = false
  }
)

const showFavicon = computed(() => Boolean(favicon.value) && !faviconFailed.value)
const hostEl = ref(null)
const isSelectedDropTarget = computed(
  () => isFolder.value && String(activeDropFolderId.value || '') === String(props.node.id)
)
const isLocked = computed(() => isFolder.value && isProtected(props.node) && !isUnlocked(props.node))

onMounted(() => {
  if (!import.meta.env.DEV || !hostEl.value) return
  console.debug('[bookmark host font]', {
    host: host.value,
    hostFont: getComputedStyle(hostEl.value).fontFamily,
    rowFont: getComputedStyle(hostEl.value.closest('.row')).fontFamily
  })
})

const visit = () => {
  recordVisit(props.node)
}

const onClick = (event) => {
  if (isFolder.value) {
    requestAccess(props.node)
    return
  }
  if (!props.node.url || event.target.closest('a')) {
    return
  }
  visit()
  openBookmarkUrl(props.node.url, { background: false })
}

const onAuxClick = (event) => {
  if (!props.node.url || event.button !== 1 || event.target.closest('a')) {
    return
  }
  event.preventDefault()
  visit()
  openBookmarkUrl(props.node.url, { background: true })
}

const onLinkAux = (event) => {
  if (event.button !== 1) {
    return
  }
  visit()
}

const onContextMenu = (event) => {
  event.preventDefault()
  event.stopPropagation()
  openContextMenu(props.node, { x: event.clientX, y: event.clientY })
}

const onDragOver = (event) => {
  if (!isFolder.value || !isBookmarkDragActive()) {
    return
  }
  if (
    !isFolderCenterDropTarget({
      element: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      isCurrentTarget: isSelectedDropTarget.value
    })
  ) {
    handleFolderDragTargetChange(null)
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  handleFolderDragTargetChange(String(props.node.id))
}

const onDragLeave = (event) => {
  if (!isFolder.value || event.currentTarget?.contains?.(event.relatedTarget)) {
    return
  }
  handleFolderDragTargetChange(null)
}
</script>

<template>
  <div
    class="row drag-handle"
    :class="{ 'row--folder': isFolder, 'row--selected': isSelectedDropTarget }"
    :data-folder-drop-id="isFolder ? String(node.id) : null"
    @click="onClick"
    @auxclick="onAuxClick"
    @contextmenu="onContextMenu"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <img
      v-if="showFavicon"
      class="row__fav"
      :src="favicon"
      :alt="node.title || ''"
      width="18"
      height="18"
      loading="lazy"
      draggable="false"
      @error="faviconFailed = true"
    />
    <span v-else class="row__mark" :class="{ 'row__mark--folder': isFolder }" aria-hidden="true">
      <LockKeyhole v-if="isLocked" :size="13" />
      <template v-else>{{ isFolder ? '/' : mark }}</template>
    </span>

    <div class="row__text">
      <template v-if="node.url">
        <a
          class="row__link row__title"
          :href="node.url"
          target="_blank"
          rel="noreferrer"
          draggable="false"
          @click.stop="visit"
          @auxclick="onLinkAux"
          >{{ node.title || '未命名书签' }}</a
        >
        <span ref="hostEl" class="row__host">{{ host }}</span>
      </template>
      <span v-else class="row__title">{{ node.title || '未命名目录' }}</span>
    </div>

    <span v-if="node.url" class="row__open" aria-hidden="true">
      <ExternalLink :size="14" />
    </span>
    <span class="row__grip" aria-hidden="true">
      <GripVertical :size="15" />
    </span>
  </div>
</template>
