<script setup>
import { Bookmark, Moon, Palette, Sun } from 'lucide-vue-next'
import { useBackgroundImage } from '../composables/useBackgroundImage'
import { useContextMenu } from '../composables/useContextMenu'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
const { openBackgroundSettings } = useBackgroundImage()
const { closeContextMenu } = useContextMenu()

const onToggleTheme = () => {
  closeContextMenu()
  toggleTheme()
}

const onOpenBackground = () => {
  closeContextMenu()
  openBackgroundSettings()
}
</script>

<template>
  <div class="topbar">
    <div class="brand">
      <span class="brand__mark" aria-hidden="true">
        <Bookmark :size="16" :stroke-width="2" />
      </span>
      <h1 class="visually-hidden">我的书签</h1>
    </div>

    <div class="topbar__actions">
      <button
        class="icon-btn"
        type="button"
        aria-label="设置背景"
        title="设置背景"
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
