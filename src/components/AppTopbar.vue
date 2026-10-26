<script setup>
import { Download, Moon, Palette, Sun } from 'lucide-vue-next'
import { useBackgroundImage } from '../composables/useBackgroundImage'
import { useBackup } from '../composables/useBackup'
import { useContextMenu } from '../composables/useContextMenu'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
const { openBackgroundSettings } = useBackgroundImage()
const { closeContextMenu } = useContextMenu()
const { exporting, exportBackup } = useBackup()

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

    <div class="topbar__actions">
      <button
        class="icon-btn"
        type="button"
        aria-label="导出备份"
        title="导出书签与本机设置"
        :disabled="exporting"
        :aria-busy="exporting"
        @click="onExport"
      >
        <Download :size="15" />
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
