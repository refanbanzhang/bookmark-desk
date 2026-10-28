<script setup>
import { ref, watch } from 'vue'
import { Check } from 'lucide-vue-next'
import { fontLabel, t, text } from '../i18n'
import {
  CARD_SIZE_PRESETS,
  CJK_FONT_PRESETS,
  LATIN_FONT_PRESETS
} from '../utils/backgroundSettings'
import { loadWallpaperCatalog, sameWallpaper } from '../utils/wallpaperCatalog'
import { ensureWebfonts } from '../utils/webfonts'
import { useBackgroundImage } from '../composables/useBackgroundImage'
import BaseModal from './BaseModal.vue'

const {
  backgroundDraft,
  backgroundSettingsOpen,
  backgroundError,
  backgroundFileInput,
  closeBackgroundSettings,
  saveBackgroundSettingsForm,
  clearBackgroundImage,
  downloadPresetWallpaper,
  cancelWallpaperDownload,
  wallpaperDownload,
  triggerBackgroundUpload,
  handleBackgroundUpload
} = useBackgroundImage()

const availableLatinFonts = LATIN_FONT_PRESETS.filter((preset) => !preset.legacy)
const availableCjkFonts = CJK_FONT_PRESETS.filter((preset) => !preset.legacy)
const wallpapers = ref([])
const galleryStatus = ref('idle')
const galleryHint = ref('')

const loadGallery = async () => {
  if (!wallpapers.value.length) {
    galleryStatus.value = 'loading'
    galleryHint.value = t('settings.galleryLoading')
  }

  try {
    const catalog = await loadWallpaperCatalog()
    wallpapers.value = catalog.items
    galleryStatus.value = catalog.items.length ? 'ready' : 'empty'
    galleryHint.value = catalog.items.length ? '' : t('settings.galleryEmpty')
  } catch {
    if (!wallpapers.value.length) {
      galleryStatus.value = 'error'
      galleryHint.value = t('settings.galleryError')
    }
  }
}

const isSelectedWallpaper = (item) =>
  backgroundDraft.value.enabled && sameWallpaper(backgroundDraft.value.imageUrl, item)

const formatSize = (bytes) => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

const downloadPercent = (job) => {
  if (!job || job.total <= 0) {
    return ''
  }
  return `${Math.min(100, Math.round((job.loaded / job.total) * 100))}%`
}

/** 有总长度就显示百分比。跨域图片经常拿不到 Content-Length，这时显示已收到的大小。 */
const downloadLabel = (job) => downloadPercent(job) || (job?.loaded > 0 ? formatSize(job.loaded) : '')

/* 各档中文字族的样式表在选中前不会加载，所以打开面板时统一注入，
   每颗按钮才能用自己的字形当预览——这几十 KB 只在面板打开时才花 */
watch(backgroundSettingsOpen, (open) => {
  if (open) {
    console.debug('[background-settings] opened', {
      latinFontCount: availableLatinFonts.length,
      cjkFontCount: availableCjkFonts.length,
      selectedLatinFont: backgroundDraft.value.latinFont,
      selectedCjkFont: backgroundDraft.value.cjkFont
    })
    ensureWebfonts(availableCjkFonts.map((preset) => preset.id))
    void loadGallery()
  }
})
</script>

<template>
  <BaseModal
    v-if="backgroundSettingsOpen"
    :title="t('settings.title')"
    :label="t('settings.title')"
    wide
    @close="closeBackgroundSettings"
  >
    <p class="modal__desc">
      {{ t('settings.desc') }}
    </p>

    <section class="settings-group">
      <h4 class="settings-group__title">{{ t('settings.layout') }}</h4>

      <label class="field">
        <span class="field__label">{{ t('settings.cardSize') }}</span>
        <div class="range">
          <input
            v-model.number="backgroundDraft.cardSize"
            class="range__input"
            type="range"
            min="0"
            :max="CARD_SIZE_PRESETS.length - 1"
            step="1"
          />
          <output class="range__value">{{ t(`size.${backgroundDraft.cardSize}`) }}</output>
        </div>
      </label>

      <div class="field">
        <span class="field__label">{{ t('settings.latin') }}</span>
        <select v-model="backgroundDraft.latinFont" class="field__input">
          <option
            v-for="preset in availableLatinFonts"
            :key="preset.id"
            :value="preset.id"
          >
            {{ fontLabel('latin', preset) }}
          </option>
        </select>
      </div>

      <div class="field">
        <span class="field__label">{{ t('settings.cjk') }}</span>
        <select v-model="backgroundDraft.cjkFont" class="field__input">
          <option
            v-for="preset in availableCjkFonts"
            :key="preset.id"
            :value="preset.id"
          >
            {{ fontLabel('cjk', preset) }}
          </option>
        </select>
      </div>

      <label class="field">
        <span class="field__label">{{ t('settings.opacity') }}</span>
        <div class="range">
          <input
            v-model.number="backgroundDraft.cardOpacity"
            class="range__input"
            type="range"
            min="0.2"
            max="1"
            step="0.01"
          />
          <output class="range__value">{{ Math.round(backgroundDraft.cardOpacity * 100) }}%</output>
        </div>
      </label>
    </section>

    <section class="settings-group">
      <h4 class="settings-group__title">{{ t('settings.background') }}</h4>

      <div class="settings-group__row">
        <label class="switch">
          <input v-model="backgroundDraft.enabled" class="switch__box" type="checkbox" />
          {{ t('settings.enable') }}
        </label>
        <div class="actions-row">
          <button class="btn btn--ghost" type="button" @click="triggerBackgroundUpload">{{ t('settings.upload') }}</button>
          <button class="btn btn--ghost" type="button" @click="clearBackgroundImage">{{ t('settings.clear') }}</button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">{{ t('settings.presets') }}</span>
        <p v-if="galleryHint" class="gallery-hint">{{ text(galleryHint) }}</p>
        <button
          v-if="galleryStatus === 'error'"
          class="btn btn--ghost gallery-retry"
          type="button"
          @click="loadGallery"
        >
          {{ t('settings.galleryRetry') }}
        </button>
        <div v-if="wallpapers.length" class="gallery">
          <div
            v-for="item in wallpapers"
            :key="item.path"
            class="gallery-item"
            :class="{ 'is-on': isSelectedWallpaper(item), 'is-busy': wallpaperDownload?.path === item.path }"
          >
            <button
              class="gallery-hit"
              type="button"
              :title="item.title"
              :aria-pressed="isSelectedWallpaper(item)"
              :disabled="Boolean(wallpaperDownload)"
              @click="downloadPresetWallpaper(item)"
            >
              <img
                v-if="item.thumbUrl"
                class="gallery-thumb"
                :src="item.thumbUrl"
                :alt="item.title"
                loading="lazy"
                decoding="async"
              />
              <span v-if="item.type === 'video'" class="gallery-tag">{{ t('settings.videoTag') }}</span>
            </button>
            <span v-if="isSelectedWallpaper(item)" class="gallery-mark">
              <Check :size="13" :stroke-width="3" />
            </span>
            <div v-if="wallpaperDownload?.path === item.path" class="gallery-mask">
              <div class="gallery-bar">
                <div
                  class="gallery-fill"
                  :class="{ 'is-wait': !downloadPercent(wallpaperDownload) }"
                  :style="downloadPercent(wallpaperDownload) ? { width: downloadPercent(wallpaperDownload) } : undefined"
                ></div>
              </div>
              <div class="gallery-line">
                <span class="gallery-pct">{{ downloadLabel(wallpaperDownload) || t('settings.downloading') }}</span>
                <button class="gallery-stop" type="button" @click="cancelWallpaperDownload">
                  {{ t('action.cancel') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <em v-if="backgroundError" class="field__error">{{ text(backgroundError) }}</em>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeBackgroundSettings">{{ t('action.cancel') }}</button>
      <button class="btn btn--primary" type="button" @click="saveBackgroundSettingsForm">{{ t('action.save') }}</button>
    </template>

    <input
      ref="backgroundFileInput"
      class="visually-hidden"
      type="file"
      accept="image/*,video/mp4"
      @change="handleBackgroundUpload"
    />
  </BaseModal>
</template>
