<script setup>
import { onMounted, onUnmounted } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import AppTopbar from './components/AppTopbar.vue'
import FolderTabs from './components/FolderTabs.vue'
import BookmarkBoard from './components/BookmarkBoard.vue'
import BackgroundSettingsDialog from './components/BackgroundSettingsDialog.vue'
import RenameDialog from './components/RenameDialog.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'
import ContextMenu from './components/ContextMenu.vue'
import { useBookmarkTree } from './composables/useBookmarkTree'
import { useBookmarkTabs } from './composables/useBookmarkTabs'
import { useBookmarkActions } from './composables/useBookmarkActions'
import { useBackgroundImage } from './composables/useBackgroundImage'
import { useTheme } from './composables/useTheme'
import { useContextMenu } from './composables/useContextMenu'

const { loading, warning, loadBookmarks } = useBookmarkTree()
const { activeTab, tabOptions, visibleNodes, visibleParentId, switchTab, initActiveTab } =
  useBookmarkTabs()
const {
  hasBackgroundImage,
  backdropStyle,
  shellStyle,
  initBackgroundSettings,
  backgroundSettingsOpen,
  closeBackgroundSettings
} = useBackgroundImage()
const { initTheme } = useTheme()
const { contextMenu, closeContextMenu } = useContextMenu()
const { editingNode, deletingNode, closeEdit, closeDeleteConfirm } = useBookmarkActions()

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
        @switch="switchTab"
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
    <ContextMenu />
  </main>
</template>
