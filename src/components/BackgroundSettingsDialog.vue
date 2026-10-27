<script setup>
import { ref, watch } from 'vue'
import {
  CARD_SIZE_PRESETS,
  CJK_FONT_PRESETS,
  LATIN_FONT_PRESETS
} from '../utils/backgroundSettings'
import { loadWallpaperCatalog } from '../utils/wallpaperCatalog'
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
  selectPresetWallpaper,
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
    galleryHint.value = '正在加载预设壁纸…'
  }

  try {
    const catalog = await loadWallpaperCatalog()
    wallpapers.value = catalog.items
    galleryStatus.value = catalog.items.length ? 'ready' : 'empty'
    galleryHint.value = catalog.items.length ? '' : '暂无预设壁纸，可上传本地图片或视频。'
  } catch {
    if (!wallpapers.value.length) {
      galleryStatus.value = 'error'
      galleryHint.value = '预设壁纸加载失败，仍可上传本地图片或视频。'
    }
  }
}

const isSelectedWallpaper = (item) =>
  backgroundDraft.value.enabled && backgroundDraft.value.imageUrl === item.url

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
    title="显示设置"
    label="显示设置"
    wide
    @close="closeBackgroundSettings"
  >
    <p class="modal__desc">
      卡片尺寸与字体对所有标签页生效；可从预设图库选择背景，或上传本地图片/视频。
    </p>

    <section class="settings-group">
      <h4 class="settings-group__title">版面</h4>

      <label class="field">
        <span class="field__label">卡片尺寸</span>
        <div class="range">
          <input
            v-model.number="backgroundDraft.cardSize"
            class="range__input"
            type="range"
            min="0"
            :max="CARD_SIZE_PRESETS.length - 1"
            step="1"
          />
          <output class="range__value">{{ CARD_SIZE_PRESETS[backgroundDraft.cardSize]?.label }}</output>
        </div>
      </label>

      <div class="field">
        <span class="field__label">西文字体</span>
        <select v-model="backgroundDraft.latinFont" class="field__input">
          <option
            v-for="preset in availableLatinFonts"
            :key="preset.id"
            :value="preset.id"
          >
            {{ preset.label }}
          </option>
        </select>
      </div>

      <div class="field">
        <span class="field__label">中文字体</span>
        <select v-model="backgroundDraft.cjkFont" class="field__input">
          <option
            v-for="preset in availableCjkFonts"
            :key="preset.id"
            :value="preset.id"
          >
            {{ preset.label }}
          </option>
        </select>
      </div>
    </section>

    <section class="settings-group">
      <h4 class="settings-group__title">背景</h4>

      <div class="settings-group__row">
        <label class="switch">
          <input v-model="backgroundDraft.enabled" class="switch__box" type="checkbox" />
          启用背景图
        </label>
        <div class="actions-row">
          <button class="btn btn--ghost" type="button" @click="triggerBackgroundUpload">上传图片或视频</button>
          <button class="btn btn--ghost" type="button" @click="clearBackgroundImage">清除背景</button>
        </div>
      </div>

      <div class="field">
        <span class="field__label">预设壁纸</span>
        <p v-if="galleryHint" class="gallery-hint">{{ galleryHint }}</p>
        <button
          v-if="galleryStatus === 'error'"
          class="btn btn--ghost gallery-retry"
          type="button"
          @click="loadGallery"
        >
          重新加载
        </button>
        <div v-if="wallpapers.length" class="gallery">
          <button
            v-for="item in wallpapers"
            :key="item.path"
            class="gallery-item"
            :class="{ 'is-on': isSelectedWallpaper(item) }"
            type="button"
            :title="item.title"
            @click="selectPresetWallpaper(item)"
          >
            <img
              v-if="item.type === 'image'"
              class="gallery-thumb"
              :src="item.url"
              :alt="item.title"
            />
            <video
              v-else
              class="gallery-thumb"
              :src="item.url"
              muted
              preload="metadata"
              playsinline
            />
            <span class="gallery-name">{{ item.title }}</span>
            <span v-if="item.type === 'video'" class="gallery-tag">视频</span>
          </button>
        </div>
      </div>

      <label class="field">
        <span class="field__label">卡片不透明度</span>
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

    <em v-if="backgroundError" class="field__error">{{ backgroundError }}</em>

    <template #footer>
      <button class="btn btn--ghost" type="button" @click="closeBackgroundSettings">取消</button>
      <button class="btn btn--primary" type="button" @click="saveBackgroundSettingsForm">保存</button>
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
