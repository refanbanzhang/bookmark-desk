<script setup>
import { Download, Moon, Palette, Search, Sun } from 'lucide-vue-next'
import { useBackgroundImage } from '../composables/useBackgroundImage'
import { useBackup } from '../composables/useBackup'
import { useBookmarkSearch } from '../composables/useBookmarkSearch'
import { useContextMenu } from '../composables/useContextMenu'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
const { openBackgroundSettings } = useBackgroundImage()
const { closeContextMenu } = useContextMenu()
const { exporting, exportBackup } = useBackup()
const { query } = useBookmarkSearch()

const onToggleTheme = () => {
  closeContextMenu()
  toggleTheme()
}

const onOpenBackground = () => {
  closeContextMenu()
  openBackgroundSettings()
}

const onExport = () => {
  closeContextMenu()
  void exportBackup()
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
        class="icon-btn tip"
        type="button"
        data-tip="导出备份"
        aria-label="导出备份"
        :disabled="exporting"
        :aria-busy="exporting"
        @click="onExport"
      >
        <Download :size="15" />
      </button>
      <button
        class="icon-btn tip"
        type="button"
        data-tip="显示设置"
        aria-label="显示设置"
        @click="onOpenBackground"
      >
        <Palette :size="15" />
      </button>
      <button
        class="icon-btn tip"
        type="button"
        :data-tip="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
        :aria-label="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
        @click="onToggleTheme"
      >
        <Moon v-if="theme === 'dark'" :size="15" />
        <Sun v-else :size="15" />
      </button>
    </div>
  </div>
</template>
