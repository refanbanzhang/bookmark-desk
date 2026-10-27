<script setup>
import { computed } from 'vue'
import { Folder, LockKeyhole, UnlockKeyhole } from 'lucide-vue-next'
import { t } from '../i18n'
import { isBookmarkDragActive, useBookmarkDrag } from '../composables/useBookmarkDrag'
import { useContextMenu } from '../composables/useContextMenu'
import { useFolderAccess } from '../composables/useFolderAccess'
import { isFolderCenterDropTarget } from '../utils/folderDropZone'

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

const emit = defineEmits(['open-folder'])

const { activeDropFolderId, handleFolderDragTargetChange } = useBookmarkDrag()
const { openContextMenu } = useContextMenu()
const { isProtected, isUnlocked, requestAccess } = useFolderAccess()

const folderId = computed(() => String(props.node.id))
const title = computed(() => props.node.title || t('name.folder'))
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
  if (
    !isFolderCenterDropTarget({
      element: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      isCurrentTarget: isDropTarget.value
    })
  ) {
    handleFolderDragTargetChange(null)
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

const openFolder = () => {
  if (!isLocked.value) {
    emit('open-folder', props.node)
  }
}
</script>

<template>
  <section
    class="module module--folder-card"
    :class="{ 'module--drop': isDropTarget }"
    role="button"
    tabindex="0"
    :aria-label="t('module.open', { title })"
    @click="openFolder"
    @keydown.enter="openFolder"
    @keydown.space.prevent="openFolder"
  >
    <div
      class="module__head drag-handle"
      :data-folder-drop-id="folderId"
      @contextmenu="onContextMenu"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <span class="module__folder-icon" aria-hidden="true">
        <LockKeyhole v-if="isLocked" :size="18" />
        <Folder v-else class="module__folder-glyph" :size="22" />
      </span>
      <h4 class="module__title">{{ title }}</h4>
    </div>

    <div class="module__rule" aria-hidden="true"></div>

    <div v-if="isLocked" class="module__locked">
      <LockKeyhole :size="18" />
      <span>{{ t('module.locked') }}</span>
      <button class="btn btn--ghost" type="button" @click.stop="unlock">
        <UnlockKeyhole :size="14" />
        {{ t('module.unlock') }}
      </button>
    </div>
    <div v-else class="module__folder-foot">
      <span>{{ t(children.length === 1 ? 'module.count1' : 'module.count', { count: children.length }) }}</span>
    </div>
  </section>
</template>
