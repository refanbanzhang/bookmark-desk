import { computed, ref } from 'vue'
import {
  clearBackgroundSettings,
  createDefaultBackgroundSettings,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  saveBackgroundSettings
} from '../utils/backgroundSettings'

const backgroundSettings = ref(createDefaultBackgroundSettings())
const backgroundDraft = ref(createDefaultBackgroundSettings())
const backgroundSettingsOpen = ref(false)
const backgroundError = ref('')
const backgroundFileInput = ref(null)

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'))
    reader.readAsDataURL(file)
  })

/**
 * 背景图：地址 / 本地上传 / 启用 / 显示强度 / 磨砂强度 / 卡片不透明度。
 * 打开对话框时以草稿预览，保存后才落盘。
 */
export const useBackgroundImage = () => {
  const previewSettings = computed(() =>
    backgroundSettingsOpen.value
      ? normalizeBackgroundSettings(backgroundDraft.value)
      : backgroundSettings.value
  )

  const hasBackgroundImage = computed(
    () => previewSettings.value.enabled && Boolean(previewSettings.value.imageUrl)
  )

  const backdropStyle = computed(() => {
    if (!hasBackgroundImage.value) {
      return {}
    }

    const blur = Number(previewSettings.value.backdropBlur) || 0
    const scale = 1 + blur / 180

    return {
      backgroundImage: `url(${JSON.stringify(previewSettings.value.imageUrl)})`,
      backgroundPosition: previewSettings.value.position,
      backgroundRepeat: previewSettings.value.repeat,
      backgroundSize: previewSettings.value.size,
      opacity: previewSettings.value.opacity,
      filter: blur > 0 ? `blur(${blur}px)` : 'none',
      transform: blur > 0 ? `scale(${scale})` : 'none'
    }
  })

  // 有背景图时，卡片不透明度决定模块底色，保证文字对比度
  const shellStyle = computed(() => ({
    '--card-alpha': hasBackgroundImage.value
      ? String(Number(previewSettings.value.cardOpacity) || 1)
      : '1'
  }))

  const initBackgroundSettings = async () => {
    backgroundSettings.value = await loadBackgroundSettings()
  }

  const persistBackgroundSettings = async (nextSettings) => {
    const saved = await saveBackgroundSettings(nextSettings)
    backgroundSettings.value = saved
    backgroundDraft.value = { ...saved }
    backgroundError.value = ''
    return saved
  }

  const openBackgroundSettings = () => {
    backgroundDraft.value = { ...backgroundSettings.value }
    backgroundError.value = ''
    backgroundSettingsOpen.value = true
  }

  const closeBackgroundSettings = () => {
    backgroundSettingsOpen.value = false
    backgroundError.value = ''
  }

  const saveBackgroundSettingsForm = async () => {
    const nextImageUrl = backgroundDraft.value.imageUrl.trim()

    if (backgroundDraft.value.enabled && !nextImageUrl) {
      backgroundError.value = '请先填写背景图地址或上传图片。'
      return
    }

    try {
      await persistBackgroundSettings({
        ...backgroundDraft.value,
        imageUrl: nextImageUrl,
        enabled: backgroundDraft.value.enabled
      })
      closeBackgroundSettings()
    } catch (error) {
      backgroundError.value = error instanceof Error ? error.message : '背景设置保存失败。'
    }
  }

  const clearBackgroundImage = async () => {
    const cleared = await clearBackgroundSettings()
    backgroundSettings.value = cleared
    backgroundDraft.value = { ...cleared }
    backgroundError.value = ''
  }

  const triggerBackgroundUpload = () => {
    backgroundFileInput.value?.click?.()
  }

  const handleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      backgroundError.value = '请选择图片文件。'
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      backgroundDraft.value.imageUrl = dataUrl
      backgroundDraft.value.enabled = true
      backgroundError.value = ''
    } catch (error) {
      backgroundError.value = error instanceof Error ? error.message : '读取图片失败。'
    }
  }

  return {
    backgroundSettings,
    backgroundDraft,
    backgroundSettingsOpen,
    backgroundError,
    backgroundFileInput,
    previewSettings,
    hasBackgroundImage,
    backdropStyle,
    shellStyle,
    initBackgroundSettings,
    openBackgroundSettings,
    closeBackgroundSettings,
    saveBackgroundSettingsForm,
    clearBackgroundImage,
    triggerBackgroundUpload,
    handleBackgroundUpload
  }
}
