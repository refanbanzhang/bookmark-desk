<script setup>
import { Download, Moon, Palette, Search, Sun } from 'lucide-vue-next'
import { locale, t, toggleLocale } from '../i18n'
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
    <h1 class="visually-hidden">{{ t('app.title') }}</h1>

    <label class="search">
      <Search :size="14" aria-hidden="true" />
      <input
        v-model="query"
        class="search__input"
        type="search"
        :placeholder="t('topbar.search')"
        :aria-label="t('topbar.search')"
        spellcheck="false"
      />
    </label>

    <div class="topbar__actions">
      <button
        class="icon-btn tip"
        type="button"
        :data-tip="t('topbar.export')"
        :aria-label="t('topbar.export')"
        :disabled="exporting"
        :aria-busy="exporting"
        @click="onExport"
      >
        <Download :size="15" />
      </button>
      <button
        class="icon-btn tip"
        type="button"
        :data-tip="t('topbar.settings')"
        :aria-label="t('topbar.settings')"
        @click="onOpenBackground"
      >
        <Palette :size="15" />
      </button>
      <button
        class="icon-btn lang-btn tip"
        type="button"
        :data-tip="t(locale === 'zh' ? 'lang.toEn' : 'lang.toZh')"
        :aria-label="t(locale === 'zh' ? 'lang.toEn' : 'lang.toZh')"
        @click="toggleLocale"
      >
        {{ locale === 'zh' ? '中' : 'EN' }}
      </button>
      <button
        class="icon-btn tip"
        type="button"
        :data-tip="t(theme === 'dark' ? 'topbar.toLight' : 'topbar.toDark')"
        :aria-label="t(theme === 'dark' ? 'topbar.toLight' : 'topbar.toDark')"
        @click="onToggleTheme"
      >
        <Moon v-if="theme === 'dark'" :size="15" />
        <Sun v-else :size="15" />
      </button>
    </div>
  </div>
</template>
