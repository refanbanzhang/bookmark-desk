import { computed, ref } from 'vue'
import {
  cacheRemoteBackground,
  cardSizeStyle,
  clearStagedBackground,
  createDefaultBackgroundSettings,
  downloadBackgroundBlob,
  fontFamilyStack,
  hasDeferredBackground,
  isRemoteBackgroundUrl,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  peekBackgroundSettings,
  readCachedBackground,
  saveBackgroundSettings,
  stageRemoteBackground
} from '../utils/backgroundSettings'
import { inferMediaType } from '../utils/wallpaperCatalog'
import { ensureWebfonts } from '../utils/webfonts'
import { rememberPrefs, requestSyncPush } from './syncBridge'

const backgroundSettings = ref(peekBackgroundSettings())
const backgroundDraft = ref(createDefaultBackgroundSettings())
const backgroundSettingsOpen = ref(false)
const backgroundError = ref('')
const backgroundFileInput = ref(null)
/* 上传图片的字节在 IndexedDB，首帧只同步拿得到「有没有图」。样式靠它才不会先按无背景图画一遍 */
const pendingLocalImage = ref(hasDeferredBackground())
let activeVideoObjectUrl = ''
let draftVideoObjectUrl = ''
const videoDraftFile = ref(null)
const wallpaperDownload = ref(null)
let wallpaperAbort = null
let cachedObjectUrl = ''
let cachedMediaSource = ''
const cachedMediaUrl = ref('')
let backgroundEpoch = 0

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'))
    reader.readAsDataURL(file)
  })

const releaseCachedMedia = () => {
  if (cachedObjectUrl) {
    URL.revokeObjectURL(cachedObjectUrl)
    cachedObjectUrl = ''
  }
  cachedMediaSource = ''
  cachedMediaUrl.value = ''
}

const adoptCachedMedia = (source, blob) => {
  if (cachedMediaSource === source && cachedObjectUrl) {
    return
  }
  releaseCachedMedia()
  cachedObjectUrl = URL.createObjectURL(blob)
  cachedMediaSource = source
  cachedMediaUrl.value = cachedObjectUrl
}

/** 本机已有这份文件才拿来画。远程地址留着同步，不在这里触发下载。 */
const displayUrl = (settings) => {
  const url = typeof settings.imageUrl === 'string' ? settings.imageUrl : ''
  if (url && url === cachedMediaSource && cachedMediaUrl.value) {
    return cachedMediaUrl.value
  }
  if (isRemoteBackgroundUrl(url)) {
    return ''
  }
  return url
}

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

  const backdropImageUrl = computed(() => {
    const settings = previewSettings.value
    /* 本地图片的真身还没读回来时没有地址可用，先不铺背景，免得去请求一个空地址 */
    const url = displayUrl(settings)
    if (settings.mediaType !== 'image' || !settings.enabled || !url) {
      return ''
    }

    return `url(${JSON.stringify(url)})`
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
    const url = displayUrl(settings)
    return settings.mediaType === 'video' && settings.enabled && url ? url : ''
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
    const ticket = backgroundEpoch
    const settings = await loadBackgroundSettings()
    if (ticket !== backgroundEpoch) {
      return
    }

    const remote = isRemoteBackgroundUrl(settings.imageUrl)
    let cached = null
    if (remote) {
      try {
        cached = await readCachedBackground(settings.imageUrl)
      } catch (error) {
        console.error('[background] 读取本地壁纸失败', error)
      }
    }

    if (cached) {
      adoptCachedMedia(settings.imageUrl, cached)
    } else if (!remote) {
      releaseCachedMedia()
    }

    if (
      settings.mediaType === 'video' &&
      typeof settings.imageUrl === 'string' &&
      settings.imageUrl.startsWith('blob:')
    ) {
      activeVideoObjectUrl = settings.imageUrl
    }
    backgroundSettings.value = settings
    pendingLocalImage.value = false
    ensureWebfonts([settings.cjkFont])
    rememberPrefs(settings)
    console.info('[background] 壁纸就绪', {
      mediaType: settings.mediaType,
      enabled: settings.enabled,
      remote,
      cached: Boolean(cached),
      blobType: cached?.type || '',
      blobSize: cached?.size || 0
    })
  }

  const persistBackgroundSettings = async (nextSettings, options = {}) => {
    const syncDraft = options.syncDraft !== false
    const publish = options.publish !== false
    const ticket = ++backgroundEpoch
    const saved = await saveBackgroundSettings(nextSettings)
    if (ticket !== backgroundEpoch) {
      return saved
    }
    const runtimeSettings = { ...saved }
    if (runtimeSettings.mediaType === 'video' && runtimeSettings.imageUrl instanceof Blob) {
      if (activeVideoObjectUrl) {
        URL.revokeObjectURL(activeVideoObjectUrl)
      }
      activeVideoObjectUrl = URL.createObjectURL(runtimeSettings.imageUrl)
      runtimeSettings.imageUrl = activeVideoObjectUrl
    } else if (activeVideoObjectUrl) {
      URL.revokeObjectURL(activeVideoObjectUrl)
      activeVideoObjectUrl = ''
    }
    if (isRemoteBackgroundUrl(runtimeSettings.imageUrl)) {
      try {
        const blob = await cacheRemoteBackground(runtimeSettings.imageUrl)
        if (ticket !== backgroundEpoch) {
          return saved
        }
        adoptCachedMedia(runtimeSettings.imageUrl, blob)
      } catch (error) {
        if (ticket !== backgroundEpoch) {
          return saved
        }
        console.error('[background] 壁纸保存到本机失败', error)
        releaseCachedMedia()
      }
    } else {
      releaseCachedMedia()
    }
    if (ticket !== backgroundEpoch) {
      return saved
    }
    releaseDraftVideo()
    backgroundSettings.value = runtimeSettings
    if (syncDraft) {
      backgroundDraft.value = { ...runtimeSettings }
    }
    backgroundError.value = ''
    pendingLocalImage.value = false
    ensureWebfonts([saved.cjkFont])
    rememberPrefs(runtimeSettings)
    if (publish) {
      requestSyncPush()
    }
    return saved
  }

  const applySyncedBackground = async (plan) => {
    const next = {
      ...backgroundSettings.value,
      ...(plan.appearance || {})
    }
    if (plan.image?.mode === 'url') {
      next.mediaType = inferMediaType(plan.image.imageUrl)
      next.imageUrl = plan.image.imageUrl
    } else if (plan.image?.mode === 'clear') {
      next.mediaType = 'image'
      next.imageUrl = ''
    }
    await persistBackgroundSettings(next, {
      syncDraft: !backgroundSettingsOpen.value,
      publish: false
    })
  }

  const openBackgroundSettings = () => {
    releaseDraftVideo()
    backgroundDraft.value = { ...backgroundSettings.value }
    backgroundError.value = ''
    backgroundSettingsOpen.value = true
  }

  const cancelWallpaperDownload = () => {
    if (!wallpaperAbort) {
      return
    }
    const job = wallpaperDownload.value
    console.info('[background] 取消壁纸下载', {
      path: job?.path || '',
      loaded: job?.loaded || 0
    })
    wallpaperAbort.abort()
  }

  const closeBackgroundSettings = () => {
    cancelWallpaperDownload()
    releaseDraftVideo()
    backgroundSettingsOpen.value = false
    backgroundError.value = ''
    clearStagedBackground()
    const url = backgroundSettings.value.imageUrl
    if (!isRemoteBackgroundUrl(url)) {
      return
    }
    void readCachedBackground(url).then((blob) => {
      if (backgroundSettingsOpen.value) {
        return
      }
      if (blob) {
        adoptCachedMedia(url, blob)
      } else {
        releaseCachedMedia()
      }
    })
  }

  const saveBackgroundSettingsForm = async () => {
    const nextImageUrl = typeof backgroundDraft.value.imageUrl === 'string'
      ? backgroundDraft.value.imageUrl.trim()
      : backgroundDraft.value.imageUrl

    if (backgroundDraft.value.enabled && !nextImageUrl) {
      backgroundError.value = 'error.bgNeed'
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
      backgroundError.value = error instanceof Error ? error.message : 'error.bgSave'
    }
  }

  const clearBackgroundImage = async () => {
    releaseDraftVideo()
    try {
      /* 清掉图片，但把尺寸、字体、透明度、圆角写回本地，刷新后还在，同步出去的也是同一份 */
      await persistBackgroundSettings({
        ...backgroundDraft.value,
        enabled: false,
        mediaType: 'image',
        imageUrl: ''
      })
    } catch (error) {
      backgroundError.value = error instanceof Error ? error.message : 'error.bgSave'
    }
  }

  const selectPresetWallpaper = (item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    if (!url) {
      backgroundError.value = '预设壁纸地址无效。'
      return
    }

    releaseDraftVideo()
    backgroundDraft.value.imageUrl = url
    backgroundDraft.value.mediaType = inferMediaType(item?.type || url)
    backgroundDraft.value.enabled = true
    backgroundError.value = ''
  }

  const downloadPresetWallpaper = async (item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    const path = typeof item?.path === 'string' ? item.path : ''
    if (!url || wallpaperAbort) {
      if (!url) {
        backgroundError.value = '预设壁纸地址无效。'
      }
      return
    }

    const controller = new AbortController()
    wallpaperAbort = controller
    const mark = path || url
    backgroundError.value = ''
    try {
      const cached = await readCachedBackground(url)
      if (controller.signal.aborted || !backgroundSettingsOpen.value) {
        return
      }
      if (cached) {
        adoptCachedMedia(url, cached)
        selectPresetWallpaper(item)
        return
      }

      wallpaperDownload.value = { path: mark, loaded: 0, total: 0 }
      const blob = await downloadBackgroundBlob(url, undefined, {
        signal: controller.signal,
        onProgress: ({ loaded, total }) => {
          if (wallpaperAbort !== controller) {
            return
          }
          wallpaperDownload.value = { path: mark, loaded, total }
        }
      })
      /* 取消或关掉面板时，半截字节已在下载函数里丢掉。不能清掉上一次下完、还没保存的壁纸。 */
      if (controller.signal.aborted || !backgroundSettingsOpen.value) {
        return
      }
      stageRemoteBackground(url, blob)
      adoptCachedMedia(url, blob)
      selectPresetWallpaper(item)
      console.info('[background] 壁纸已下载', { blobType: blob?.type || '', blobSize: blob?.size || 0 })
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        return
      }
      console.error('[background] 壁纸保存到本机失败', error)
      backgroundError.value = error instanceof Error ? error.message : 'error.bg.download'
    } finally {
      if (wallpaperAbort === controller) {
        wallpaperAbort = null
        wallpaperDownload.value = null
      }
    }
  }

  const triggerBackgroundUpload = () => {
    backgroundFileInput.value?.click?.()
  }

  const handleBackdropVideoError = (event) => {
    const video = event?.currentTarget
    const currentSrc = typeof video?.currentSrc === 'string' ? video.currentSrc : ''
    console.error('[background] 视频壁纸无法播放', {
      code: video?.error?.code,
      message: video?.error?.message,
      src: currentSrc.slice(0, 160),
      networkState: video?.networkState,
      readyState: video?.readyState,
      blobType: cachedMediaSource ? 'cached' : ''
    })
    if (currentSrc && currentSrc === cachedMediaUrl.value && isRemoteBackgroundUrl(backgroundSettings.value.imageUrl)) {
      console.error('[background] 本地视频播不了，改回远程地址')
      releaseCachedMedia()
    }
  }

  const releaseBackgroundVideo = () => {
    releaseDraftVideo()
    releaseCachedMedia()
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
      backgroundError.value = 'error.bgType'
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
      backgroundError.value = error instanceof Error ? error.message : 'error.bgRead'
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
    backdropImageUrl,
    backdropVideoUrl,
    backdropStyle,
    shellStyle,
    initBackgroundSettings,
    applySyncedBackground,
    openBackgroundSettings,
    closeBackgroundSettings,
    saveBackgroundSettingsForm,
    clearBackgroundImage,
    selectPresetWallpaper,
    downloadPresetWallpaper,
    cancelWallpaperDownload,
    wallpaperDownload,
    triggerBackgroundUpload,
    handleBackgroundUpload,
    handleBackdropVideoError,
    releaseBackgroundVideo
  }
}
