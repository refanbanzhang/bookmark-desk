<script setup>
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import AppTopbar from './components/AppTopbar.vue'
import FolderTabs from './components/FolderTabs.vue'
import BookmarkBoard from './components/BookmarkBoard.vue'
import BackgroundSettingsDialog from './components/BackgroundSettingsDialog.vue'
import RenameDialog from './components/RenameDialog.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'
import ContextMenu from './components/ContextMenu.vue'
import FolderAccessDialog from './components/FolderAccessDialog.vue'
import { useBookmarkTree } from './composables/useBookmarkTree'
import { useBookmarkTabs } from './composables/useBookmarkTabs'
import { useBookmarkActions } from './composables/useBookmarkActions'
import { useBackgroundImage } from './composables/useBackgroundImage'
import { useTheme } from './composables/useTheme'
import { useContextMenu } from './composables/useContextMenu'
import { useFolderAccess } from './composables/useFolderAccess'

const { loading, warning, loadBookmarks } = useBookmarkTree()
const { activeTab, tabOptions, visibleNodes, visibleParentId, switchTab, initActiveTab } =
  useBookmarkTabs()
const {
  hasBackgroundImage,
  backdropImageUrl,
  backdropStyle,
  shellStyle,
  initBackgroundSettings,
  backgroundSettingsOpen,
  closeBackgroundSettings
} = useBackgroundImage()
const backdropEl = ref(null)

/* 整张背景图单独写到元素上，不进 :style——本地图片是数百万字符的 data URL，
   交给 Vue 就会在每次重渲染（含每次拖滑块）整串重写一遍，一次几十毫秒。 */
watchEffect(
  () => {
    if (backdropEl.value) {
      backdropEl.value.style.backgroundImage = backdropImageUrl.value
    }
  },
  { flush: 'post' }
)
const { initTheme } = useTheme()
const { contextMenu, closeContextMenu } = useContextMenu()
const { requestAccess } = useFolderAccess()
const { editingNode, deletingNode, closeEdit, closeDeleteConfirm } = useBookmarkActions()

const handleTabSwitch = (tabId) => {
  const folder = tabOptions.value.find((tab) => tab.id === tabId)?.node
  if (folder) {
    requestAccess(folder, () => switchTab(tabId))
    return
  }
  switchTab(tabId)
}

const handleGlobalKeydown = (event) => {
  if (event.key !== 'Escape') {
    return
  }

  if (contextMenu.value.visible) {
    closeContextMenu()
    return
  }

  if (deletingNode.value) {
    closeDeleteConfirm()
    return
  }

  if (editingNode.value) {
    closeEdit()
    return
  }

  if (backgroundSettingsOpen.value) {
    closeBackgroundSettings()
  }
}

const handleViewportChange = () => {
  closeContextMenu()
}

onMounted(() => {
  initTheme()
  initActiveTab()
  void initBackgroundSettings()
  void loadBookmarks()

  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <main class="page-shell" :class="{ 'has-backdrop': hasBackgroundImage }" :style="shellStyle" @click="closeContextMenu">
    <div
      ref="backdropEl"
      class="page-backdrop"
      :class="{ 'is-active': hasBackgroundImage }"
      :style="backdropStyle"
      aria-hidden="true"
    ></div>

    <div class="app-content">
      <AppTopbar />

      <FolderTabs
        v-if="tabOptions.length"
        :tabs="tabOptions"
        :active-tab="activeTab"
        @switch="handleTabSwitch"
      />

      <p v-if="warning" class="notice" role="status" aria-live="polite">
        <TriangleAlert :size="15" />
        {{ warning }}
      </p>

      <BookmarkBoard :nodes="visibleNodes" :loading="loading" :parent-id="visibleParentId" />
    </div>

    <BackgroundSettingsDialog />
    <RenameDialog />
    <DeleteConfirmDialog />
    <FolderAccessDialog />
    <ContextMenu />
  </main>
</template>
