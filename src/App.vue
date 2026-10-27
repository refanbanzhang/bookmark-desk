<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { ArrowLeft, TriangleAlert } from 'lucide-vue-next'
import AppTopbar from './components/AppTopbar.vue'
import FolderTabs from './components/FolderTabs.vue'
import BookmarkBoard from './components/BookmarkBoard.vue'
import BackgroundSettingsDialog from './components/BackgroundSettingsDialog.vue'
import RenameDialog from './components/RenameDialog.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'
import ContextMenu from './components/ContextMenu.vue'
import FolderAccessDialog from './components/FolderAccessDialog.vue'
import CreateFolderDialog from './components/CreateFolderDialog.vue'
import RecentStrip from './components/RecentStrip.vue'
import { useBookmarkTree } from './composables/useBookmarkTree'
import { useBookmarkTabs } from './composables/useBookmarkTabs'
import { useBookmarkActions } from './composables/useBookmarkActions'
import { useBackgroundImage } from './composables/useBackgroundImage'
import { useTheme } from './composables/useTheme'
import { useContextMenu } from './composables/useContextMenu'
import { useFolderAccess } from './composables/useFolderAccess'
import { initSyncPrefs } from './composables/useSyncPrefs'
import { useBookmarkSearch } from './composables/useBookmarkSearch'
import { useRecentVisits } from './composables/useRecentVisits'

const { loading, warning, loadBookmarks } = useBookmarkTree()
const {
  activeTab,
  tabOptions,
  visibleNodes,
  visibleParentId,
  currentFolder,
  isDrilledDown,
  switchTab,
  openFolder,
  revealFolder,
  goBack,
  initActiveTab
} = useBookmarkTabs()
const { query, isSearching, results, clearQuery } = useBookmarkSearch()
const { recentNodes } = useRecentVisits()
const {
  hasBackgroundImage,
  hasBackgroundVideo,
  backdropImageUrl,
  backdropVideoUrl,
  backdropStyle,
  shellStyle,
  initBackgroundSettings,
  backgroundSettingsOpen,
  closeBackgroundSettings,
  releaseBackgroundVideo
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
const { editingNode, deletingNode, creating, closeEdit, closeDeleteConfirm, closeCreate } = useBookmarkActions()

const handleTabSwitch = (tabId) => {
  const folder = tabOptions.value.find((tab) => tab.id === tabId)?.node
  if (folder) {
    requestAccess(folder, () => switchTab(tabId))
    return
  }
  switchTab(tabId)
}

const handleFolderOpen = (folder) => {
  requestAccess(folder, () => {
    if (isSearching.value) {
      const drilled = revealFolder(folder.id)
      clearQuery()
      if (drilled) {
        window.history.pushState({ bookmarkFolder: true }, '')
      }
      return
    }
    if (openFolder(folder.id)) {
      window.history.pushState({ bookmarkFolder: true }, '')
    }
  })
}

const handlePopState = () => {
  if (isDrilledDown.value) {
    goBack()
  }
}

const handleFolderBack = () => {
  if (window.history.state?.bookmarkFolder) {
    window.history.back()
    return
  }
  goBack()
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

  if (creating.value) {
    closeCreate()
    return
  }

  if (query.value) {
    clearQuery()
    return
  }

  if (backgroundSettingsOpen.value) {
    closeBackgroundSettings()
  }
}

const handleViewportChange = () => {
  closeContextMenu()
}

const logFolderBarLayout = async () => {
  if (!import.meta.env.DEV) {
    return
  }

  await nextTick()
  const bars = [...document.querySelectorAll('.tabbar, .folder-page-head')]
  console.debug(
    '[bookmark layout]',
    bars.map((bar) => ({
      className: bar.className,
      height: Math.round(bar.getBoundingClientRect().height),
      top: Math.round(bar.getBoundingClientRect().top)
    }))
  )
}

watch(isDrilledDown, logFolderBarLayout)

let stopSync = () => {}
let leftPage = false

onMounted(() => {
  initTheme()
  initActiveTab()
  void initBackgroundSettings().then(async () => {
    const stop = await initSyncPrefs()
    if (leftPage) {
      stop()
      return
    }
    stopSync = stop
  })
  void loadBookmarks()

  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  leftPage = true
  stopSync()
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('popstate', handlePopState)
  releaseBackgroundVideo()
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
    >
      <video
        v-if="hasBackgroundVideo"
        class="page-backdrop__video"
        :src="backdropVideoUrl"
        autoplay
        loop
        muted
        playsinline
        aria-hidden="true"
      ></video>
    </div>

    <div class="app-content">
      <AppTopbar />

      <FolderTabs
        v-if="tabOptions.length && !isDrilledDown && !isSearching"
        :tabs="tabOptions"
        :active-tab="activeTab"
        @switch="handleTabSwitch"
      />

      <header v-else-if="isDrilledDown && currentFolder && !isSearching" class="folder-page-head">
        <div class="folder-page-head__title">
          <div>
            <h2 class="tab tab--active folder-page-head__name">
              {{ currentFolder.title || '未命名目录' }}
            </h2>
          </div>
        </div>
        <button class="folder-page-head__back" type="button" @click="handleFolderBack">
          <ArrowLeft :size="16" aria-hidden="true" />
          返回上级
        </button>
      </header>

      <p v-if="warning" class="notice" role="status" aria-live="polite">
        <TriangleAlert :size="15" />
        {{ warning }}
      </p>

      <RecentStrip v-if="!loading && !isSearching && !isDrilledDown && recentNodes.length" :nodes="recentNodes" />

      <BookmarkBoard
        :nodes="isSearching ? results : visibleNodes"
        :loading="loading"
        :parent-id="isSearching ? null : visibleParentId"
        :sortable="!isSearching"
        :empty-title="isSearching ? '没有匹配的书签' : '暂无书签'"
        :empty-hint="isSearching ? '换个标题或地址再试。' : '在 Chrome 书签管理器里添加内容。'"
        @open-folder="handleFolderOpen"
      />
    </div>

    <CreateFolderDialog />
    <BackgroundSettingsDialog />
    <RenameDialog />
    <DeleteConfirmDialog />
    <FolderAccessDialog />
    <ContextMenu />
  </main>
</template>
