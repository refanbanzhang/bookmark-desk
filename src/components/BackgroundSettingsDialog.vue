<script setup>
import { watch } from 'vue'
import {
  CARD_SIZE_PRESETS,
  CJK_FONT_PRESETS,
  LATIN_FONT_PRESETS
} from '../utils/backgroundSettings'
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
  triggerBackgroundUpload,
  handleBackgroundUpload
} = useBackgroundImage()

/* 各档中文字族的样式表在选中前不会加载，所以打开面板时统一注入，
   每颗按钮才能用自己的字形当预览——这几十 KB 只在面板打开时才花 */
watch(backgroundSettingsOpen, (open) => {
  if (open) {
    ensureWebfonts(CJK_FONT_PRESETS.map((preset) => preset.id))
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
      卡片尺寸与字体对所有标签页生效；背景图和卡片不透明度保存后持久化到本地。
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
            v-for="preset in LATIN_FONT_PRESETS"
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
            v-for="preset in CJK_FONT_PRESETS"
            :key="preset.id"
            :value="preset.id"
          >
            {{ preset.label }}
          </option>
        </select>
      </div>
    </section>

    <section class="settings-group">
      <h4 class="settings-group__title">背景图</h4>

      <div class="settings-group__row">
        <label class="switch">
          <input v-model="backgroundDraft.enabled" class="switch__box" type="checkbox" />
          启用背景图
        </label>
        <div class="actions-row">
          <button class="btn btn--ghost" type="button" @click="triggerBackgroundUpload">上传本地图片</button>
          <button class="btn btn--ghost" type="button" @click="clearBackgroundImage">清除背景</button>
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
      accept="image/*"
      @change="handleBackgroundUpload"
    />
  </BaseModal>
</template>
