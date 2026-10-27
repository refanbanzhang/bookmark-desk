export const BACKGROUND_SETTINGS_KEY = 'bookmark-background-settings'

/** 「卡片尺寸」档位：索引即设置值，特小档为默认。四组取值一起改，保证每档都是排好的。
    图标不在这张表里——换档位只改列数、格子高与卡内行高，图标始终保持 36px。
    tilesH 最低 128：固定 36px 图标 + 两行标题与 host 在内约为 126，再低就会把标题压出格。 */
export const CARD_SIZE_PRESETS = [
  { label: '特小', cols: 6, cellH: 140, tilesH: 128, rowH: 32 },
  { label: '小', cols: 5, cellH: 156, tilesH: 132, rowH: 36 },
  { label: '标准', cols: 4, cellH: 190, tilesH: 140, rowH: 40 },
  { label: '大', cols: 3, cellH: 216, tilesH: 148, rowH: 44 }
]

export const DEFAULT_CARD_SIZE = 0

/** 「西文字体」档位。families 只列自己的字族，系统兜底由 fontFamilyStack 统一追加。
    label 就是字体自己的名字，所以选择器里直接用对应字族渲染，选中前就能看出差别。 */
export const LATIN_FONT_PRESETS = [
  { id: 'system', label: '系统', families: "-apple-system, 'Segoe UI'" },
  { id: 'inter', label: 'Inter', families: "'Inter'" },
  { id: 'roboto', label: 'Roboto', families: "'Roboto'" },
  { id: 'open-sans', label: 'Open Sans', families: "'Open Sans'" },
  { id: 'lato', label: 'Lato', families: "'Lato'" },
  { id: 'montserrat', label: 'Montserrat', families: "'Montserrat'" },
  { id: 'poppins', label: 'Poppins', families: "'Poppins'" },
  { id: 'nunito-sans', label: 'Nunito Sans', families: "'Nunito Sans'" },
  { id: 'source-sans-3', label: 'Source Sans 3', families: "'Source Sans 3'" },
  { id: 'plex', label: 'IBM Plex Sans', families: "'IBM Plex Sans'" },
  { id: 'geist', label: 'Geist', families: "'Geist'", legacy: true },
  { id: 'manrope', label: 'Manrope', families: "'Manrope'", legacy: true }
]

export const DEFAULT_LATIN_FONT = 'inter'

/** 「中文字体」档位。hrefs 是 webfont 样式表，按需注入（见 utils/webfonts.js）；
    系统档与思源不带——思源已经由 index.html 的 Google Fonts 链接提供。
    苹方不能随扩展分发，所以系统档只做本地字族回退。 */
export const CJK_FONT_PRESETS = [
  {
    id: 'system',
    label: '系统',
    families: "'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB'",
    hrefs: []
  },
  { id: 'noto', label: '思源', families: "'Noto Sans SC'", hrefs: [] },
  { id: 'noto-serif', label: '思源宋体', families: "'Noto Serif SC'", hrefs: [] },
  { id: 'lxgw-wenkai', label: '霞鹜文楷', families: "'LXGW WenKai TC'", hrefs: [] },
  { id: 'zcool-xiaowei', label: '站酷小薇', families: "'ZCOOL XiaoWei'", hrefs: [] },
  { id: 'zcool-qingke', label: '站酷庆科黄油体', families: "'ZCOOL QingKe HuangYou'", hrefs: [] },
  { id: 'ma-shan-zheng', label: '马善政', families: "'Ma Shan Zheng'", hrefs: [] },
  { id: 'long-cang', label: '龙藏体', families: "'Long Cang'", hrefs: [] },
  { id: 'liu-jian-mao-cao', label: '刘建毛草', families: "'Liu Jian Mao Cao'", hrefs: [] },
  {
    id: 'misans',
    label: 'MiSans',
    families: "'MiSans'",
    legacy: true,
    hrefs: [
      'https://cdn.jsdelivr.net/npm/misans-webfont@4.3.1/misans/misans-regular/result.min.css',
      'https://cdn.jsdelivr.net/npm/misans-webfont@4.3.1/misans/misans-medium/result.min.css'
    ]
  },
  {
    id: 'harmony',
    label: '鸿蒙',
    families: "'HarmonyOS Sans SC'",
    legacy: true,
    hrefs: [
      'https://cdn.jsdelivr.net/npm/harmonyos-sans-sc-webfont-splitted@1.1.0/dist/Regular.css',
      'https://cdn.jsdelivr.net/npm/harmonyos-sans-sc-webfont-splitted@1.1.0/dist/Medium.css'
    ]
  }
]

export const DEFAULT_CJK_FONT = 'noto'

export const isKnownLatinFont = (value) =>
  LATIN_FONT_PRESETS.some((preset) => preset.id === value)

export const isKnownCjkFont = (value) =>
  CJK_FONT_PRESETS.some((preset) => preset.id === value)

const findPreset = (presets, value, fallbackId) =>
  presets.find((preset) => preset.id === value) || presets.find((preset) => preset.id === fallbackId)

/** 中文档位必须排在西文与系统兜底之间：苹方这类字族本身就带西文字形，
    顺序一旦倒过来，中文档位就永远轮不到（system-ui 会先把汉字接走）。 */
export const fontFamilyStack = (latinFont, cjkFont) =>
  [
    findPreset(LATIN_FONT_PRESETS, latinFont, DEFAULT_LATIN_FONT).families,
    findPreset(CJK_FONT_PRESETS, cjkFont, DEFAULT_CJK_FONT).families,
    "system-ui, -apple-system, 'Segoe UI', sans-serif"
  ].join(', ')

export const cardSizeStyle = (cardSize) => {
  const preset = CARD_SIZE_PRESETS[cardSize] || CARD_SIZE_PRESETS[DEFAULT_CARD_SIZE]

  return {
    '--cell-cols': String(preset.cols),
    '--cell-h': `${preset.cellH}px`,
    '--cell-h-tiles': `${preset.tilesH}px`,
    '--cell-row-h': `${preset.rowH}px`
  }
}

const BACKGROUND_IMAGE_DB_NAME = 'bookmark-background-settings-db'
const BACKGROUND_IMAGE_STORE_NAME = 'background-assets'
const BACKGROUND_IMAGE_KEY = 'active-background-image'
const BACKGROUND_VIDEO_KEY = 'active-background-video'
const BACKGROUND_IMAGE_FLAG = '__indexeddb_background_image__'
const BACKGROUND_VIDEO_FLAG = '__indexeddb_background_video__'
const QUOTA_ERROR_NAMES = new Set([
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED'
])

let dbPromise = null

export const createDefaultBackgroundSettings = () => ({
  enabled: false,
  mediaType: 'image',
  imageUrl: '',
  cardOpacity: 1,
  cardSize: DEFAULT_CARD_SIZE,
  latinFont: DEFAULT_LATIN_FONT,
  cjkFont: DEFAULT_CJK_FONT,
  cardBlur: 0,
  cardRadius: 12,
  tabRadius: 10,
  position: 'center center',
  size: 'contain',
  repeat: 'no-repeat'
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '')
const isBlob = (value) => typeof Blob !== 'undefined' && value instanceof Blob

const isEmbeddedImageUrl = (value) => /^data:image\//.test(toTrimmedString(value))
const isEmbeddedVideoUrl = (value) => /^data:video\//.test(toTrimmedString(value))
const isRemoteHttpUrl = (value) => /^https?:\/\//i.test(toTrimmedString(value))
const isBlobUrl = (value) => /^blob:/i.test(toTrimmedString(value))

const isQuotaError = (error) =>
  error instanceof Error && (QUOTA_ERROR_NAMES.has(error.name) || error.message.includes('quota'))

const openDb = () => {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }

  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(BACKGROUND_IMAGE_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(BACKGROUND_IMAGE_STORE_NAME)) {
        db.createObjectStore(BACKGROUND_IMAGE_STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })

  return dbPromise
}

const withStore = async (mode, run) => {
  const db = await openDb()
  if (!db) {
    return null
  }

  return new Promise((resolve) => {
    const tx = db.transaction(BACKGROUND_IMAGE_STORE_NAME, mode)
    const store = tx.objectStore(BACKGROUND_IMAGE_STORE_NAME)
    run(store, resolve)
    tx.onerror = () => resolve(null)
  })
}

const backgroundImageStore = {
  async getImageUrl() {
    const entry = await withStore('readonly', (store, resolve) => {
      const req = store.get(BACKGROUND_IMAGE_KEY)
      req.onsuccess = () => resolve(req.result?.value || '')
      req.onerror = () => resolve('')
    })

    return typeof entry === 'string' ? entry : ''
  },

  async setImageUrl(imageUrl) {
    const saved = await withStore('readwrite', (store, resolve) => {
      const req = store.put({
        key: BACKGROUND_IMAGE_KEY,
        value: imageUrl,
        updatedAt: Date.now()
      })
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })

    return saved === true
  },

  async clearImageUrl() {
    const cleared = await withStore('readwrite', (store, resolve) => {
      const req = store.delete(BACKGROUND_IMAGE_KEY)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })

    return cleared !== false
  },

  async getVideo() {
    const entry = await withStore('readonly', (store, resolve) => {
      const req = store.get(BACKGROUND_VIDEO_KEY)
      req.onsuccess = () => resolve(req.result?.value || null)
      req.onerror = () => resolve(null)
    })

    return entry instanceof Blob ? entry : null
  },

  async setVideo(video) {
    const saved = await withStore('readwrite', (store, resolve) => {
      const req = store.put({
        key: BACKGROUND_VIDEO_KEY,
        value: video,
        updatedAt: Date.now()
      })
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })

    return saved === true
  },

  async clearVideo() {
    const cleared = await withStore('readwrite', (store, resolve) => {
      const req = store.delete(BACKGROUND_VIDEO_KEY)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })

    return cleared !== false
  }
}

const buildPersistedPayload = async (normalized, imageStore) => {
  if (normalized.mediaType === 'video') {
    if (isRemoteHttpUrl(normalized.imageUrl)) {
      await imageStore.clearImageUrl()
      if (imageStore.clearVideo) {
        await imageStore.clearVideo()
      }
      return {
        ...normalized,
        imageUrl: normalized.imageUrl,
        imageStorage: ''
      }
    }

    if (isBlob(normalized.imageUrl) || isEmbeddedVideoUrl(normalized.imageUrl)) {
      const stored = imageStore.setVideo
        ? await imageStore.setVideo(normalized.imageUrl)
        : false
      if (!stored) {
        throw new Error('本地视频保存失败，请重试或换一个视频文件。')
      }
    } else if (!isBlobUrl(normalized.imageUrl)) {
      throw new Error('视频资源已失效，请重新上传 MP4 文件。')
    }

    await imageStore.clearImageUrl()
    return {
      ...normalized,
      imageUrl: BACKGROUND_VIDEO_FLAG,
      imageStorage: 'indexeddb'
    }
  }

  if (!isEmbeddedImageUrl(normalized.imageUrl)) {
    await imageStore.clearImageUrl()
    if (imageStore.clearVideo) {
      await imageStore.clearVideo()
    }
    return {
      ...normalized,
      imageUrl: normalized.imageUrl,
      imageStorage: ''
    }
  }

  const stored = await imageStore.setImageUrl(normalized.imageUrl)
  if (!stored) {
    throw new Error('本地图片保存失败，请重试或改用图片地址。')
  }

  return {
    ...normalized,
    imageUrl: BACKGROUND_IMAGE_FLAG,
    imageStorage: 'indexeddb'
  }
}

const readStoredPayload = (storage) => {
  try {
    const raw = storage?.getItem?.(BACKGROUND_SETTINGS_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const pickStoredImageUrl = (parsed) => toTrimmedString(parsed?.imageUrl ?? parsed?.url ?? '')

/** 上传的图片字节存在 IndexedDB，localStorage 只留一个标记 */
const isStoredLocalImage = (parsed) =>
  toTrimmedString(parsed?.imageStorage) === 'indexeddb' ||
  pickStoredImageUrl(parsed) === BACKGROUND_IMAGE_FLAG

const isStoredLocalVideo = (parsed) =>
  pickStoredImageUrl(parsed) === BACKGROUND_VIDEO_FLAG ||
  (toTrimmedString(parsed?.mediaType) === 'video' &&
    toTrimmedString(parsed?.imageStorage) === 'indexeddb')

const resolvePersistedImageUrl = async (parsed, imageStore) => {
  if (isStoredLocalVideo(parsed)) {
    const video = imageStore.getVideo ? await imageStore.getVideo() : null
    return video ? URL.createObjectURL(video) : ''
  }

  if (isStoredLocalImage(parsed)) {
    return imageStore.getImageUrl()
  }

  return pickStoredImageUrl(parsed)
}

export const normalizeBackgroundSettings = (value = {}) => {
  const fallback = createDefaultBackgroundSettings()
  const rawImageUrl = value.imageUrl ?? value.url ?? ''
  const imageUrl = isBlob(rawImageUrl) ? rawImageUrl : toTrimmedString(rawImageUrl)
  const mediaType = value.mediaType === 'video' ? 'video' : fallback.mediaType
  const enabled = value.enabled === undefined ? Boolean(imageUrl) : Boolean(value.enabled)
  const cardOpacity = Number(value.cardOpacity)
  const cardSize = Number(value.cardSize)
  const cardRadius = Number(value.cardRadius)
  const tabRadius = Number(value.tabRadius ?? value.cardRadius)
  /* 西文字体早先存在 fontFamily 上，读旧数据时接过来 */
  const latinFont = value.latinFont ?? value.fontFamily
  /* cover 会裁掉竖图主体；设置里也没有这个选项。旧数据里的 cover 按新默认 contain 读。 */
  const size = ['contain', 'auto'].includes(value.size) ? value.size : fallback.size
  const repeat = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(value.repeat)
    ? value.repeat
    : fallback.repeat

  return {
    enabled,
    mediaType,
    imageUrl,
    cardOpacity: Number.isFinite(cardOpacity) ? clamp(cardOpacity, 0.2, 1) : fallback.cardOpacity,
    cardSize: Number.isFinite(cardSize)
      ? Math.round(clamp(cardSize, 0, CARD_SIZE_PRESETS.length - 1))
      : fallback.cardSize,
    latinFont: isKnownLatinFont(latinFont) ? latinFont : fallback.latinFont,
    cjkFont: isKnownCjkFont(value.cjkFont) ? value.cjkFont : fallback.cjkFont,
    cardBlur: fallback.cardBlur,
    cardRadius: Number.isFinite(cardRadius) ? clamp(cardRadius, 0, 28) : fallback.cardRadius,
    tabRadius: Number.isFinite(tabRadius) ? clamp(tabRadius, 0, 28) : fallback.tabRadius,
    position: toTrimmedString(value.position) || fallback.position,
    size,
    repeat
  }
}

export const loadBackgroundSettings = async (
  storage = globalThis.localStorage,
  imageStore = backgroundImageStore
) => {
  const fallback = createDefaultBackgroundSettings()
  const parsed = readStoredPayload(storage)

  if (!parsed) {
    return fallback
  }

  try {
    const imageUrl = await resolvePersistedImageUrl(parsed, imageStore)
    return normalizeBackgroundSettings({
      ...parsed,
      imageUrl
    })
  } catch {
    return fallback
  }
}

/**
 * 首帧同步快照：设置本体都在 localStorage，只有上传图片的字节在 IndexedDB。
 * 首次渲染用它当初值，卡片样式才不会先按「无背景图」画一帧再翻转。
 * 此时本地图片只拿得到标记，imageUrl 先留空，由 hasStoredLocalBackgroundImage 补上「有图」这个事实。
 */
export const peekBackgroundSettings = (storage = globalThis.localStorage) => {
  const parsed = readStoredPayload(storage)

  if (!parsed) {
    return createDefaultBackgroundSettings()
  }

  return normalizeBackgroundSettings({
    ...parsed,
    imageUrl: isStoredLocalImage(parsed) ? '' : pickStoredImageUrl(parsed)
  })
}

/** 同步判断 localStorage 是否标记了一张存在 IndexedDB 的本地背景图 */
export const hasStoredLocalBackgroundImage = (storage = globalThis.localStorage) =>
  isStoredLocalImage(readStoredPayload(storage))

/** 本地上传的图片或视频：字节在 IndexedDB，不能进同步 */
export const isLocalBackgroundSource = (settings) => {
  if (!settings || typeof settings !== 'object') {
    return false
  }
  if (isStoredLocalImage(settings) || isStoredLocalVideo(settings)) {
    return true
  }
  const url = settings.imageUrl
  if (isBlob(url)) {
    return true
  }
  if (typeof url !== 'string' || !url) {
    return false
  }
  return /^data:/i.test(url) || isBlobUrl(url)
}

export const hasStoredLocalBackgroundMedia = (storage = globalThis.localStorage) =>
  isLocalBackgroundSource(readStoredPayload(storage))

export const saveBackgroundSettings = async (
  settings,
  storage = globalThis.localStorage,
  imageStore = backgroundImageStore
) => {
  const normalized = normalizeBackgroundSettings(settings)
  const persisted = await buildPersistedPayload(normalized, imageStore)

  try {
    storage?.setItem?.(BACKGROUND_SETTINGS_KEY, JSON.stringify(persisted))
    return normalized
  } catch (error) {
    if (persisted.imageStorage === 'indexeddb') {
      await imageStore.clearImageUrl()
      if (normalized.mediaType === 'video' && imageStore.clearVideo) {
        await imageStore.clearVideo()
      }
    }

    if (isQuotaError(error)) {
      throw new Error('背景设置保存失败，存储空间不足。请改用图片地址或换一张更小的图片。')
    }

    throw error
  }
}

export const clearBackgroundSettings = async (
  preserve = {},
  storage = globalThis.localStorage,
  imageStore = backgroundImageStore
) => {
  storage?.removeItem?.(BACKGROUND_SETTINGS_KEY)
  await imageStore.clearImageUrl()
  if (imageStore.clearVideo) {
    await imageStore.clearVideo()
  }
  /* 「清除背景」只该清掉图片，卡片尺寸这类显示偏好要留住 */
  return normalizeBackgroundSettings({ ...createDefaultBackgroundSettings(), ...preserve })
}
