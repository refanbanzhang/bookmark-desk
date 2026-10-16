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
  cardSizeStyle,
  clearBackgroundSettings,
  createDefaultBackgroundSettings,
  fontFamilyStack,
  hasStoredLocalBackgroundImage,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  peekBackgroundSettings,
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

const createImageStore = (initial = '') => {
  let imageUrl = initial
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
    peek: () => imageUrl
  }
}

test('normalizes background settings and keeps image-enabled state', () => {
  const settings = normalizeBackgroundSettings({
    imageUrl: '  https://example.com/bg.jpg  ',
    opacity: 2,
    backdropBlur: 30,
    cardOpacity: 2,
    cardBlur: 99,
    cardRadius: 99,
    tabRadius: 99,
    size: 'contain',
    repeat: 'repeat-x'
  })

  assert.deepEqual(settings, {
    enabled: true,
    imageUrl: 'https://example.com/bg.jpg',
    opacity: 1,
    backdropBlur: 24,
    cardOpacity: 1,
    cardSize: 2,
    latinFont: 'inter',
    cjkFont: 'noto',
    cardBlur: 0,
    cardRadius: 28,
    tabRadius: 28,
    position: 'center center',
    size: 'contain',
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
    imageUrl: '',
    opacity: 0.72,
    backdropBlur: 6,
    cardOpacity: 1,
    cardSize: 2,
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

test('saves normalized settings and clears them', async () => {
  const storage = createMemoryStorage()
  const imageStore = createImageStore()
  const saved = await saveBackgroundSettings({ imageUrl: 'https://example.com/bg.png', enabled: false }, storage, imageStore)

  assert.equal(saved.enabled, false)
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], JSON.stringify({ ...saved, imageStorage: '' }))

  const cleared = await clearBackgroundSettings({}, storage, imageStore)
  assert.deepEqual(cleared, createDefaultBackgroundSettings())
  assert.equal(storage.dump()[BACKGROUND_SETTINGS_KEY], undefined)
  assert.equal(imageStore.peek(), '')
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
    '--cell-h-tiles': '138px',
    '--cell-row-h': '32px'
  })
  /* 图标尺寸不随档位变，不该出现在档位变量里 */
  assert.equal('--cell-icon' in cardSizeStyle(0), false)
  /* 越界的档位回落到默认档，而不是渲染出 undefined 变量 */
  assert.equal(cardSizeStyle(7)['--cell-cols'], '4')
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
  assert.equal(peeked.imageUrl, 'https://example.com/bg.jpg')
  assert.equal(peeked.cardSize, 0)
  assert.equal(hasStoredLocalBackgroundImage(storage), false)
})

test('peek keeps the layout state but leaves the local image url empty', () => {
  const storage = createMemoryStorage({
    [BACKGROUND_SETTINGS_KEY]: JSON.stringify({
      enabled: true,
      imageUrl: '__indexeddb_background_image__',
      imageStorage: 'indexeddb',
      cardSize: 1,
      opacity: 0.5
    })
  })
  const peeked = peekBackgroundSettings(storage)

  /* 图片字节还在 IndexedDB 里，首帧先只声明「有图」，让卡片样式一次画对 */
  assert.equal(peeked.enabled, true)
  assert.equal(peeked.imageUrl, '')
  assert.equal(peeked.cardSize, 1)
  assert.equal(peeked.opacity, 0.5)
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
