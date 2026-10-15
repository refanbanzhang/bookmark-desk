<script setup>
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
</script>

<template>
  <BaseModal
    v-if="backgroundSettingsOpen"
    title="背景设置"
    label="背景设置"
    wide
    @close="closeBackgroundSettings"
  >
    <p class="modal__desc">
      支持背景图地址、本地上传、显示强度与磨砂效果，保存后会持久化到本地。
    </p>

    <label class="field">
      <span class="field__label">图片地址</span>
      <input
        v-model="backgroundDraft.imageUrl"
        class="field__input"
        type="url"
        placeholder="https://example.com/background.jpg"
        spellcheck="false"
      />
      <em class="field__hint">留空则使用纯色底</em>
    </label>

    <div class="actions-row">
      <button class="btn btn--ghost" type="button" @click="triggerBackgroundUpload">上传本地图片</button>
      <button class="btn btn--ghost" type="button" @click="clearBackgroundImage">清除背景</button>
    </div>

    <label class="switch">
      <input v-model="backgroundDraft.enabled" class="switch__box" type="checkbox" />
      启用背景图
    </label>

    <label class="field">
      <span class="field__label">显示强度</span>
      <div class="range">
        <input
          v-model.number="backgroundDraft.opacity"
          class="range__input"
          type="range"
          min="0.2"
          max="1"
          step="0.01"
        />
        <output class="range__value">{{ Math.round(backgroundDraft.opacity * 100) }}%</output>
      </div>
    </label>

    <label class="field">
      <span class="field__label">磨砂强度</span>
      <div class="range">
        <input
          v-model.number="backgroundDraft.backdropBlur"
          class="range__input"
          type="range"
          min="0"
          max="24"
          step="1"
        />
        <output class="range__value">{{ Math.round(backgroundDraft.backdropBlur) }}px</output>
      </div>
    </label>

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
