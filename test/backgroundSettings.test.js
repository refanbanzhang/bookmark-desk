import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BACKGROUND_SETTINGS_KEY,
  CARD_SIZE_PRESETS,
  CJK_FONT_PRESETS,
  DEFAULT_CARD_SIZE,
  DEFAULT_CJK_FONT,
  DEFAULT_LATIN_FONT,
  LATIN_FONT_PRESETS,
  cacheRemoteBackground,
  cardSizeStyle,
  clearBackgroundSettings,
  createDefaultBackgroundSettings,
  downloadBackgroundBlob,
  fontFamilyStack,
  hasCachedBackground,
  hasDeferredBackground,
  hasStoredLocalBackgroundImage,
  isLocalBackgroundSource,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  peekBackgroundSettings,
  rememberCachedBackground,
  saveBackgroundSettings
} from '../src/utils/backgroundSettings.js'

const createMemoryStorage = (initial = {}) => {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    dump: () => Object.fromEntries(store.entries())
  }
}

const createImageStore = (initial = '', options = {}) => {
  let imageUrl = initial
  let video = null
  let cache = null
  let fetches = 0
  const fetchBlob = options.fetchBlob || new Blob(['remote'], { type: 'image/jpeg' })
  const fetchError = options.fetchError || null
  const cacheWrites = options.cacheWrites !== false
  return {
    getImageUrl: async () => imageUrl,
    setImageUrl: async (nextImageUrl) => {
      imageUrl = nextImageUrl
      return true
    },
    clearImageUrl: async () => {
      imageUrl = ''
      return true
    },
    getVideo: async () => video,
    setVideo: async (nextVideo) => {
      video = nextVideo
      return true
    },
    clearVideo: async () => {
      video = null
      return true
    },
    getCached: async (source) => (cache?.source === source ? cache.blob : null),
    setCached: async (source, blob) => {
      cache = { source, blob }
      return cacheWrites
    },
    clearCached: async () => {
      cache = null
      return true
    },
    fetchRemote: async () => {
      fetches += 1
      if (fetchError) {
        throw fetchError
      }
      return fetchBlob
    },
    peek: () => imageUrl,
    peekVideo: () => video,
    peekCache: () => cache,
    fetches: () => fetches
  }
}

test('normalizes background settings and keeps image-enabled state', () => {
  const settings = normalizeBackgroundSettings({
    imageUrl: '  https://example.com/bg.jpg  ',
    cardOpacity: 2,
    cardBlur: 99,
    cardRadius: 99,
    tabRadius: 99,
    size: 'contain',
    repeat: 'repeat-x'
  })

  assert.deepEqual(settings, {
    enabled: true,
    mediaType: 'image',
    imageUrl: 'https://example.com/bg.jpg',
    cardOpacity: 1,
    cardSize: 0,
    latinFont: 'inter',
    cjkFont: 'noto',
    cardBlur: 0,
    cardRadius: 28,
    tabRadius: 28,
    position: 'center center',
    size: 'cover',
    repeat: 'repeat-x'
  })
})

test('respects explicit disabled state when image url exists', () => {
  const settings = normalizeBackgroundSettings({
    imageUrl: 'https://example.com/bg.jpg',
    enabled: false
  })

  assert.equal(settings.enabled, false)
  assert.equal(settings.imageUrl, 'https://example.com/bg.jpg')
})

test('falls back to card radius for legacy directory radius settings', () => {
  const settings = normalizeBackgroundSettings({
    cardRadius: 18
  })

  assert.equal(settings.tabRadius, 18)
})

test('loads defaults for missing or invalid data', async () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: '{"imageUrl":123,"opacity":"oops"}'
  })

  assert.deepEqual(await loadBackgroundSettings(storage), {
    enabled: false,
    mediaType: 'image',
    imageUrl: '',
    cardOpacity: 1,
    cardSize: 0,
    latinFont: 'inter',
    cjkFont: 'noto',
    cardBlur: 0,
    cardRadius: 12,
    tabRadius: 10,
    position: 'center center',
    size: 'cover',
    repeat: 'no-repeat'
  })
})

test('wallpaper size covers the viewport', () => {
  assert.equal(normalizeBackgroundSettings({ size: 'cover' }).size, 'cover')
  assert.equal(normalizeBackgroundSettings({ size: 'contain' }).size, 'cover')
  assert.equal(normalizeBackgroundSettings({ size: '100% 100%' }).size, 'cover')
  assert.equal(normalizeBackgroundSettings({}).size, 'cover')
  assert.equal(createDefaultBackgroundSettings().size, 'cover')
  assert.equal(normalizeBackgroundSettings({ size: 'auto' }).size, 'auto')
})

test('saves normalized settings and clears them', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore()
  const saved = await saveBackgroundSettings({ imageUrl: 'https://example.com/bg.png', enabled: false }, storage, imageStore)

  assert.equal(saved.enabled, false)
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], JSON.stringify({ ...saved, imageStorage: 'cache' }))
  assert.equal(imageStore.fetches(), 1)
  assert.equal(imageStore.peekCache()?.source, 'https://example.com/bg.png')

  const cleared = await clearBackgroundSettings({}, storage, imageStore)
  assert.deepEqual(cleared, createDefaultBackgroundSettings())
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], undefined)
  assert.equal(imageStore.peek(), '')
  assert.equal(imageStore.peekCache(), null)
})

test('clearing the background keeps the chosen layout preferences', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore('data:image/png;base64,abc')

  const cleared = await clearBackgroundSettings(
    { cardSize: 0, latinFont: 'geist', cjkFont: 'misans' },
    storage,
    imageStore
  )

  assert.equal(cleared.cardSize, 0)
  assert.equal(cleared.latinFont, 'geist')
  assert.equal(cleared.cjkFont, 'misans')
  assert.equal(cleared.imageUrl, '')
  assert.equal(cleared.enabled, false)
})

test('keeps a known font and falls back to the default for unknown ones', () => {
  const fonts = normalizeBackgroundSettings({ latinFont: 'manrope', cjkFont: 'misans' })

  assert.equal(fonts.latinFont, 'manrope')
  assert.equal(fonts.cjkFont, 'misans')
  assert.equal(normalizeBackgroundSettings({ latinFont: 'comic-sans' }).latinFont, DEFAULT_LATIN_FONT)
  assert.equal(normalizeBackgroundSettings({ cjkFont: 'comic-sans' }).cjkFont, DEFAULT_CJK_FONT)
  assert.equal(normalizeBackgroundSettings({}).latinFont, DEFAULT_LATIN_FONT)
  assert.equal(normalizeBackgroundSettings({}).cjkFont, DEFAULT_CJK_FONT)

  /* 西文字体早先存在 fontFamily 上，旧数据不该被重置成默认值 */
  assert.equal(normalizeBackgroundSettings({ fontFamily: 'geist' }).latinFont, 'geist')
  assert.equal(normalizeBackgroundSettings({ latinFont: 'plex', fontFamily: 'geist' }).latinFont, 'plex')
})

test('stacks the latin family, then the cjk family, then the system fallbacks', () => {
  assert.equal(fontFamilyStack('plex', 'misans'), "'IBM Plex Sans', 'MiSans', system-ui, -apple-system, 'Segoe UI', sans-serif")

  const stack = fontFamilyStack('inter', 'harmony')
  /* 顺序不能倒：苹方这类中文字族自带西文字形，system-ui 排在前面会把汉字先接走，
     中文档位就永远轮不到 */
  assert.ok(stack.indexOf("'HarmonyOS Sans SC'") < stack.indexOf('system-ui'))
  assert.ok(stack.indexOf("'Inter'") < stack.indexOf("'HarmonyOS Sans SC'"))

  /* 认不出的档位要落到默认档的字族，不能把 undefined 交给 :style */
  assert.equal(fontFamilyStack('oops', 'oops'), fontFamilyStack(DEFAULT_LATIN_FONT, DEFAULT_CJK_FONT))
  assert.equal(fontFamilyStack(undefined, undefined), fontFamilyStack(DEFAULT_LATIN_FONT, DEFAULT_CJK_FONT))
})

test('only the webfont cjk presets carry stylesheets to inject', () => {
  const byId = (id) => CJK_FONT_PRESETS.find((preset) => preset.id === id)

  assert.deepEqual(byId('system').hrefs, [])
  assert.ok(byId('misans').hrefs.length > 0)
  assert.ok(byId('harmony').hrefs.length > 0)
  /* 每个档位都要有字族与按钮文案，面板里才不会渲染出空按钮 */
  assert.equal(
    [...LATIN_FONT_PRESETS, ...CJK_FONT_PRESETS].every((preset) => preset.label && preset.families),
    true
  )
})

test('clamps card size to a known preset and maps it to css vars', () => {
  assert.equal(normalizeBackgroundSettings({ cardSize: 99 }).cardSize, CARD_SIZE_PRESETS.length - 1)
  assert.equal(normalizeBackgroundSettings({ cardSize: -3 }).cardSize, 0)
  assert.equal(normalizeBackgroundSettings({ cardSize: 'oops' }).cardSize, DEFAULT_CARD_SIZE)
  assert.equal(normalizeBackgroundSettings({ cardSize: 1.6 }).cardSize, 2)

  assert.deepEqual(cardSizeStyle(0), {
    '--cell-cols': '6',
    '--cell-h': '140px',
    '--cell-h-tiles': '128px',
    '--cell-row-h': '32px'
  })
  /* 图标尺寸不随档位变，不该出现在档位变量里 */
  assert.equal('--cell-icon' in cardSizeStyle(0), false)
  /* 越界的档位回落到默认档，而不是渲染出 undefined 变量 */
  assert.equal(cardSizeStyle(7)['--cell-cols'], '6')
})

test('stores uploaded background image outside localStorage', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore()
  const dataUrl = 'data:image/png;base64,abc123'

  const saved = await saveBackgroundSettings({ imageUrl: dataUrl, enabled: true }, storage, imageStore)
  const persisted = JSON.parse(storage.dump()[BACKGROUND_SETTINGS_KEY])
  const loaded = await loadBackgroundSettings(storage, imageStore)

  assert.equal(saved.imageUrl, dataUrl)
  assert.equal(persisted.imageUrl, '__indexeddb_background_image__')
  assert.equal(persisted.imageStorage, 'indexeddb')
  assert.equal(imageStore.peek(), dataUrl)
  assert.equal(loaded.imageUrl, dataUrl)
})

test('downloads a remote wallpaper once and keeps the url for sync', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore('data:image/png;base64,old')
  const url = 'https://cdn.jsdelivr.net/gh/refanbanzhang/cdn-images@main/wallpapers/loop.mp4'

  const saved = await saveBackgroundSettings(
    { mediaType: 'video', imageUrl: url, enabled: true },
    storage,
    imageStore
  )
  await saveBackgroundSettings(
    { mediaType: 'video', imageUrl: url, enabled: true },
    storage,
    imageStore
  )
  const persisted = JSON.parse(storage.dump()[BACKGROUND_SETTINGS_KEY])
  const loaded = await loadBackgroundSettings(storage, imageStore)

  assert.equal(saved.imageUrl, url)
  assert.equal(saved.mediaType, 'video')
  assert.equal(persisted.imageUrl, url)
  assert.equal(persisted.imageStorage, 'cache')
  assert.equal(imageStore.fetches(), 1)
  assert.equal(imageStore.peek(), '')
  assert.equal(imageStore.peekVideo(), null)
  assert.equal(imageStore.peekCache()?.source, url)
  assert.equal(loaded.imageUrl, url)
  assert.equal(isLocalBackgroundSource(saved), false)
  assert.equal(isLocalBackgroundSource(persisted), false)
  assert.equal(hasCachedBackground(storage), true)
  assert.equal(hasDeferredBackground(storage), true)
})

test('does not save a remote wallpaper when the download fails', async () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: JSON.stringify({ imageUrl: 'https://example.com/old.jpg', enabled: true })
  })
  const imageStore = createImageStore('', { fetchError: new Error('壁纸下载失败，请重试。') })

  await assert.rejects(
    () => saveBackgroundSettings({ imageUrl: 'https://example.com/new.jpg', enabled: true }, storage, imageStore),
    /壁纸下载失败/
  )
  assert.equal(
    storage.dump()[BACKGROUND_SETTINGS_KEY],
    JSON.stringify({ imageUrl: 'https://example.com/old.jpg', enabled: true })
  )
  assert.equal(imageStore.peekCache(), null)
})

test('refuses to keep a remote wallpaper when local storage rejects the file', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore('', { cacheWrites: false })

  await assert.rejects(
    () => saveBackgroundSettings({ imageUrl: 'https://example.com/bg.jpg', enabled: true }, storage, imageStore),
    /存储空间不足/
  )
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], undefined)
})

test('replaces the cached file when the remote wallpaper changes', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore()
  const first = 'https://example.com/a.jpg'
  const second = 'https://example.com/b.mp4'

  await saveBackgroundSettings({ imageUrl: first, enabled: true }, storage, imageStore)
  await saveBackgroundSettings({ mediaType: 'video', imageUrl: second, enabled: true }, storage, imageStore)

  assert.equal(imageStore.fetches(), 2)
  assert.equal(imageStore.peekCache()?.source, second)
  assert.equal(JSON.parse(storage.dump()[BACKGROUND_SETTINGS_KEY]).imageUrl, second)
})

test('marks an existing remote wallpaper as cached without changing its url', () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: JSON.stringify({
      enabled: true,
      imageUrl: 'https://example.com/bg.jpg',
      imageStorage: ''
    })
  })

  rememberCachedBackground(storage)
  const persisted = JSON.parse(storage.dump()[BACKGROUND_SETTINGS_KEY])

  assert.equal(persisted.imageUrl, 'https://example.com/bg.jpg')
  assert.equal(persisted.imageStorage, 'cache')
  rememberCachedBackground(storage)
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], JSON.stringify(persisted))
})

test('download rejects a failed response and an empty file', async () => {
  await assert.rejects(
    () => downloadBackgroundBlob('https://example.com/bg.jpg', async () => ({ ok: false, blob: async () => new Blob(['x']) })),
    /壁纸下载失败/
  )
  await assert.rejects(
    () => downloadBackgroundBlob('https://example.com/bg.jpg', async () => { throw new Error('offline') }),
    /壁纸下载失败/
  )
  await assert.rejects(
    () => downloadBackgroundBlob('https://example.com/bg.jpg', async () => ({ ok: true, blob: async () => new Blob([]) })),
    /壁纸下载失败/
  )

  const blob = new Blob(['img'], { type: 'image/jpeg' })
  assert.equal(
    await downloadBackgroundBlob('https://example.com/bg.jpg', async () => ({ ok: true, blob: async () => blob })),
    blob
  )

  const untyped = new Blob(['video'], { type: 'application/octet-stream' })
  const typed = await downloadBackgroundBlob(
    'https://cdn.example/wallpapers/loop.mp4',
    async () => ({ ok: true, blob: async () => untyped })
  )
  assert.equal(typed.type, 'video/mp4')
  assert.equal(typed.size, untyped.size)
})

test('download reports progress from the response stream', async () => {
  const steps = []
  const blob = await downloadBackgroundBlob('https://cdn.example/a.jpg', async () => ({
    ok: true,
    headers: {
      get: (name) => (name === 'content-length' ? '4' : 'image/jpeg')
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      }
    })
  }), {
    onProgress: ({ loaded, total }) => steps.push([loaded, total])
  })

  assert.deepEqual(steps, [[2, 4], [4, 4]])
  assert.equal(blob.size, 4)
  assert.equal(blob.type, 'image/jpeg')
})

test('cancel drops bytes already received', async () => {
  const controller = new AbortController()
  let canceled = false
  await assert.rejects(
    () => downloadBackgroundBlob('https://cdn.example/loop.mp4', async () => ({
      ok: true,
      headers: {
        get: (name) => (name === 'content-length' ? '8' : 'video/mp4')
      },
      body: new ReadableStream({
        start(stream) {
          stream.enqueue(new Uint8Array([1, 2, 3, 4]))
        },
        cancel() {
          canceled = true
        }
      })
    }), {
      signal: controller.signal,
      onProgress() {
        controller.abort()
      }
    }),
    (error) => error?.name === 'AbortError'
  )
  assert.equal(canceled, true)
})

test('cacheRemoteBackground reuses the stored file for the same url', async () => {
  const imageStore = createImageStore()
  const url = 'https://example.com/bg.jpg'
  const first = await cacheRemoteBackground(url, imageStore)
  const second = await cacheRemoteBackground(url, imageStore)

  assert.equal(first, second)
  assert.equal(imageStore.fetches(), 1)
})

test('remote http backgrounds are not treated as local media', () => {
  assert.equal(
    isLocalBackgroundSource({ mediaType: 'image', imageUrl: 'https://example.com/bg.jpg' }),
    false
  )
  assert.equal(
    isLocalBackgroundSource({ mediaType: 'video', imageUrl: 'https://example.com/bg.mp4' }),
    false
  )
  assert.equal(
    isLocalBackgroundSource({ mediaType: 'video', imageUrl: 'blob:http://localhost/1' }),
    true
  )
  assert.equal(
    isLocalBackgroundSource({ mediaType: 'video', imageUrl: '__indexeddb_background_video__' }),
    true
  )
})

test('stores uploaded MP4 background video as a Blob outside localStorage', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore()
  const video = new Blob(['video'], { type: 'video/mp4' })

  const saved = await saveBackgroundSettings(
    { mediaType: 'video', imageUrl: video, enabled: true },
    storage,
    imageStore
  )
  const persisted = JSON.parse(storage.dump()[BACKGROUND_SETTINGS_KEY])

  assert.equal(saved.mediaType, 'video')
  assert.equal(persisted.imageUrl, '__indexeddb_background_video__')
  assert.equal(persisted.imageStorage, 'indexeddb')
  assert.equal(imageStore.peekVideo(), video)
})

test('peeks the stored settings synchronously for the first render', () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: JSON.stringify({
      enabled: true,
      imageUrl: 'https://example.com/bg.jpg',
      cardSize: 0,
      imageStorage: ''
    })
  })
  const peeked = peekBackgroundSettings(storage)

  assert.equal(peeked.enabled, true)
  assert.equal(peeked.imageUrl, '')
  assert.equal(peeked.cardSize, 0)
  assert.equal(hasStoredLocalBackgroundImage(storage), false)
  assert.equal(hasDeferredBackground(storage), true)
  assert.equal(hasCachedBackground(storage), false)
})

test('peek keeps the layout state but leaves the local image url empty', () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: JSON.stringify({
      enabled: true,
      imageUrl: '__indexeddb_background_image__',
      imageStorage: 'indexeddb',
      cardSize: 1
    })
  })
  const peeked = peekBackgroundSettings(storage)

  /* 图片字节还在 IndexedDB 里，首帧先只声明「有图」，让卡片样式一次画对 */
  assert.equal(peeked.enabled, true)
  assert.equal(peeked.imageUrl, '')
  assert.equal(peeked.cardSize, 1)
  assert.equal(hasStoredLocalBackgroundImage(storage), true)
})

test('peek falls back to defaults for empty or broken storage', () => {
  assert.deepEqual(peekBackgroundSettings(createMemoryStorage()), createDefaultBackgroundSettings())
  assert.deepEqual(
    peekBackgroundSettings(createMemoryStorage({ [BACKGROUND_SETTINGS_KEY]: 'not json' })),
    createDefaultBackgroundSettings()
  )
  assert.equal(hasStoredLocalBackgroundImage(createMemoryStorage({ [BACKGROUND_SETTINGS_KEY]: '[]' })), false)
})
