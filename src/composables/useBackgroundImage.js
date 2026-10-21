import { computed, ref } from 'vue'
import {
  cardSizeStyle,
  clearBackgroundSettings,
  createDefaultBackgroundSettings,
  fontFamilyStack,
  hasStoredLocalBackgroundImage,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  peekBackgroundSettings,
  saveBackgroundSettings
} from '../utils/backgroundSettings'
import { ensureWebfonts } from '../utils/webfonts'

const backgroundSettings = ref(peekBackgroundSettings())
const backgroundDraft = ref(createDefaultBackgroundSettings())
const backgroundSettingsOpen = ref(false)
const backgroundError = ref('')
const backgroundFileInput = ref(null)
/* 上传图片的字节在 IndexedDB，首帧只同步拿得到「有没有图」。样式靠它才不会先按无背景图画一遍 */
const pendingLocalImage = ref(hasStoredLocalBackgroundImage())
let activeVideoObjectUrl = ''
let draftVideoObjectUrl = ''
const videoDraftFile = ref(null)

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'))
    reader.readAsDataURL(file)
  })

/**
 * 背景图：地址 / 本地上传 / 启用 / 卡片不透明度。
 * 打开对话框时以草稿预览，保存后才落盘。
 */
export const useBackgroundImage = () => {
  const previewSettings = computed(() =>
    backgroundSettingsOpen.value
      ? normalizeBackgroundSettings(backgroundDraft.value)
      : backgroundSettings.value
  )

  const hasBackgroundImage = computed(() => {
    const settings = previewSettings.value
    /* 对话框里以草稿为准，不再用落盘图片兜底，否则清空地址时预览不会跟着回落 */
    const pending = backgroundSettingsOpen.value ? false : pendingLocalImage.value
    return settings.enabled && Boolean(settings.imageUrl || pending)
  })

  const hasBackgroundVideo = computed(() =>
    hasBackgroundImage.value && previewSettings.value.mediaType === 'video'
  )

  /* 背景资源地址与其余样式分开暴露：本地上传的图片是数百万字符的 data URL，
     挂在 :style 上会被 Vue 在组件每次重渲染时整串重写（拖滑块每个事件都要重来一次，
     一次几十毫秒）。调用方只在它真的变化时写到元素上。 */
  const backdropImageUrl = computed(() => {
    const settings = previewSettings.value
    /* 本地图片的真身还没读回来时没有地址可用，先不铺背景，免得去请求一个空地址 */
    if (settings.mediaType !== 'image' || !settings.enabled || !settings.imageUrl) {
      return ''
    }

    return `url(${JSON.stringify(settings.imageUrl)})`
  })

  const backdropStyle = computed(() => {
    const settings = previewSettings.value
    if (!settings.enabled || !settings.imageUrl) {
      return {}
    }

    return {
      backgroundPosition: settings.position,
      backgroundRepeat: settings.repeat,
      backgroundSize: settings.size
    }
  })

  const backdropVideoUrl = computed(() => {
    const settings = previewSettings.value
    return settings.mediaType === 'video' && settings.enabled && typeof settings.imageUrl === 'string'
      ? settings.imageUrl
      : ''
  })

  const releaseDraftVideo = () => {
    if (draftVideoObjectUrl) {
      URL.revokeObjectURL(draftVideoObjectUrl)
      draftVideoObjectUrl = ''
    }
    videoDraftFile.value = null
  }

  // 有背景图时，卡片不透明度决定模块底色，保证文字对比度；卡片尺寸整屏生效，与背景图无关
  const shellStyle = computed(() => ({
    '--card-alpha': hasBackgroundImage.value
      ? String(Number(previewSettings.value.cardOpacity) || 1)
      : '1',
    ...cardSizeStyle(previewSettings.value.cardSize),
    /* 字体写在整屏容器上而不是 :root：弹窗都在 .page-shell 内部，一起换掉才没有漏网的。
       body 的 font-family 是按 :root 的值算完再继承的，改 --font-sans 覆盖不到它 */
    fontFamily: fontFamilyStack(
      previewSettings.value.latinFont,
      previewSettings.value.cjkFont
    )
  }))

  const initBackgroundSettings = async () => {
    backgroundSettings.value = await loadBackgroundSettings()
    if (backgroundSettings.value.mediaType === 'video') {
      activeVideoObjectUrl = backgroundSettings.value.imageUrl
    }
    pendingLocalImage.value = false
    ensureWebfonts([backgroundSettings.value.cjkFont])
  }

  const persistBackgroundSettings = async (nextSettings) => {
    const saved = await saveBackgroundSettings(nextSettings)
    const runtimeSettings = { ...saved }
    if (runtimeSettings.mediaType === 'video' && runtimeSettings.imageUrl instanceof Blob) {
      if (activeVideoObjectUrl) {
        URL.revokeObjectURL(activeVideoObjectUrl)
      }
      activeVideoObjectUrl = URL.createObjectURL(runtimeSettings.imageUrl)
      runtimeSettings.imageUrl = activeVideoObjectUrl
    } else if (runtimeSettings.mediaType !== 'video' && activeVideoObjectUrl) {
      URL.revokeObjectURL(activeVideoObjectUrl)
      activeVideoObjectUrl = ''
    }
    releaseDraftVideo()
    backgroundSettings.value = runtimeSettings
    backgroundDraft.value = { ...runtimeSettings }
    backgroundError.value = ''
    pendingLocalImage.value = false
    ensureWebfonts([saved.cjkFont])
    return saved
  }

  const openBackgroundSettings = () => {
    releaseDraftVideo()
    backgroundDraft.value = { ...backgroundSettings.value }
    backgroundError.value = ''
    backgroundSettingsOpen.value = true
  }

  const closeBackgroundSettings = () => {
    releaseDraftVideo()
    backgroundSettingsOpen.value = false
    backgroundError.value = ''
  }

  const saveBackgroundSettingsForm = async () => {
    const nextImageUrl = typeof backgroundDraft.value.imageUrl === 'string'
      ? backgroundDraft.value.imageUrl.trim()
      : backgroundDraft.value.imageUrl

    if (backgroundDraft.value.enabled && !nextImageUrl) {
      backgroundError.value = '请先上传一张背景图。'
      return
    }

    try {
      await persistBackgroundSettings({
        ...backgroundDraft.value,
        imageUrl: backgroundDraft.value.mediaType === 'video'
          ? videoDraftFile.value || backgroundDraft.value.imageUrl
          : nextImageUrl,
        enabled: backgroundDraft.value.enabled
      })
      closeBackgroundSettings()
    } catch (error) {
      backgroundError.value = error instanceof Error ? error.message : '背景设置保存失败。'
    }
  }

  const clearBackgroundImage = async () => {
    releaseDraftVideo()
    const cleared = await clearBackgroundSettings({
      cardSize: backgroundDraft.value.cardSize,
      latinFont: backgroundDraft.value.latinFont,
      cjkFont: backgroundDraft.value.cjkFont
    })
    backgroundSettings.value = cleared
    backgroundDraft.value = { ...cleared }
    backgroundError.value = ''
    pendingLocalImage.value = false
    if (activeVideoObjectUrl) {
      URL.revokeObjectURL(activeVideoObjectUrl)
      activeVideoObjectUrl = ''
    }
  }

  const triggerBackgroundUpload = () => {
    backgroundFileInput.value?.click?.()
  }

  const releaseBackgroundVideo = () => {
    releaseDraftVideo()
    if (activeVideoObjectUrl) {
      URL.revokeObjectURL(activeVideoObjectUrl)
      activeVideoObjectUrl = ''
    }
  }

  const handleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
    if (!file.type.startsWith('image/') && !isMp4) {
      backgroundError.value = '请选择图片或 MP4 视频文件。'
      return
    }

    try {
      if (isMp4) {
        releaseDraftVideo()
        draftVideoObjectUrl = URL.createObjectURL(file)
        backgroundDraft.value.imageUrl = draftVideoObjectUrl
        videoDraftFile.value = file
        backgroundDraft.value.mediaType = 'video'
      } else {
        releaseDraftVideo()
        backgroundDraft.value.imageUrl = await readFileAsDataUrl(file)
        backgroundDraft.value.mediaType = 'image'
      }
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
    hasBackgroundVideo,
    backdropImageUrl,
    backdropVideoUrl,
    backdropStyle,
    shellStyle,
    initBackgroundSettings,
    openBackgroundSettings,
    closeBackgroundSettings,
    saveBackgroundSettingsForm,
    clearBackgroundImage,
    triggerBackgroundUpload,
    handleBackgroundUpload,
    releaseBackgroundVideo
  }
}
