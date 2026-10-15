<script setup>
import { computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Bookmark } from 'lucide-vue-next'
import { ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { useBookmarkDrag } from '../composables/useBookmarkDrag'
import { useContextMenu } from '../composables/useContextMenu'

const props = defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['switch'])

const { activeDropTabId, handleTabDragOver, handleTabDragLeave, handleTabDrop, moveRootFolderOrder } =
  useBookmarkDrag()
const { openTabContextMenu } = useContextMenu()

/** 「全部书签」是合成项，只有真实目录之间才存在换位 */
const reorderable = computed(
  () => props.tabs.length > 1 && props.tabs.every((tab) => tab.id !== ROOT_BOOKMARKS_TAB_ID)
)

const onDragEnd = (event) => {
  const targetId = String(event.item?.dataset.nodeId || '')
  const oldIndex = Number.isInteger(event.oldIndex) ? event.oldIndex : -1
  const newIndex = Number.isInteger(event.newIndex) ? event.newIndex : -1
  if (!targetId || oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return
  }

  const order = props.tabs.map((tab) => String(tab.id))
  const [moved] = order.splice(oldIndex, 1)
  order.splice(newIndex, 0, moved)

  void moveRootFolderOrder({ targetId, beforeId: order[newIndex + 1] || null })
}
</script>

<template>
  <VueDraggable
    tag="nav"
    class="tabbar"
    aria-label="书签分类"
    :model-value="tabs"
    :disabled="!reorderable"
    :animation="0"
    ghost-class="tab--ghost"
    chosen-class="tab--chosen"
    drag-class="tab--drag"
    @end="onDragEnd"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab"
      :class="{
        'tab--active': activeTab === tab.id,
        'tab--drop': activeDropTabId === tab.id
      }"
      type="button"
      :data-node-id="tab.id === ROOT_BOOKMARKS_TAB_ID ? null : tab.id"
      :data-folder-tab-id="tab.id === ROOT_BOOKMARKS_TAB_ID ? null : tab.id"
      :title="tab.id === ROOT_BOOKMARKS_TAB_ID ? '' : '拖动可调整目录顺序，书签拖到这里可移入'"
      @click="emit('switch', tab.id)"
      @contextmenu.prevent.stop="openTabContextMenu(tab.id, $event)"
      @dragover="handleTabDragOver(tab.id, $event)"
      @dragleave="handleTabDragLeave(tab.id, $event)"
      @drop="handleTabDrop(tab.id, $event)"
    >
      <Bookmark v-if="tab.id === ROOT_BOOKMARKS_TAB_ID" :size="14" />
      {{ tab.label }}
    </button>
  </VueDraggable>
</template>
