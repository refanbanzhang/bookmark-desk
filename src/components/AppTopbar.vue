<script setup>
import { FolderPlus, Moon, Palette, Search, Sun } from 'lucide-vue-next'
import { useBackgroundImage } from '../composables/useBackgroundImage'
import { useBookmarkActions } from '../composables/useBookmarkActions'
import { useBookmarkSearch } from '../composables/useBookmarkSearch'
import { useBookmarkTabs } from '../composables/useBookmarkTabs'
import { useContextMenu } from '../composables/useContextMenu'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
const { openBackgroundSettings } = useBackgroundImage()
const { closeContextMenu } = useContextMenu()
const { query } = useBookmarkSearch()
const { visibleParentId, currentFolder } = useBookmarkTabs()
const { openCreate } = useBookmarkActions()

const onToggleTheme = () => {
  closeContextMenu()
  toggleTheme()
}

const onOpenBackground = () => {
  closeContextMenu()
  openBackgroundSettings()
}

const onCreateFolder = () => {
  closeContextMenu()
  const parentTitle = currentFolder.value?.title || ''
  openCreate(visibleParentId.value, parentTitle)
}
</script>

<template>
  <div class="topbar">
    <h1 class="visually-hidden">我的书签</h1>

    <label class="search">
      <Search :size="14" aria-hidden="true" />
      <input
        v-model="query"
        class="search__input"
        type="search"
        placeholder="搜索标题或地址"
        aria-label="搜索标题或地址"
        spellcheck="false"
      />
    </label>

    <div class="topbar__actions">
      <button
        class="icon-btn"
        type="button"
        aria-label="新建目录"
        title="新建目录"
        @click="onCreateFolder"
      >
        <FolderPlus :size="15" />
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="显示设置"
        title="显示设置"
        @click="onOpenBackground"
      >
        <Palette :size="15" />
      </button>
      <button
        class="icon-btn"
        type="button"
        :aria-label="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
        :title="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
        @click="onToggleTheme"
      >
        <Moon v-if="theme === 'dark'" :size="15" />
        <Sun v-else :size="15" />
      </button>
    </div>
  </div>
</template>
