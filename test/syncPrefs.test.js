import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultBackgroundSettings } from '../src/utils/backgroundSettings.js'
import {
  SYNC_CURSOR_KEY,
  createSyncRecord,
  isSharedImageUrl,
  isUntouchedPrefs,
  planSyncApply,
  readCursor,
  writeCursor
} from '../src/utils/syncPrefs.js'

const now = () => 1_000

const prefs = (patch = {}) => ({
  ...createDefaultBackgroundSettings(),
  ...patch
})

test('only http and https background urls are shared', () => {
  assert.equal(isSharedImageUrl('https://example.com/bg.jpg'), true)
  assert.equal(isSharedImageUrl('  http://example.com/bg.png  '), true)
  assert.equal(isSharedImageUrl('data:image/png;base64,abc'), false)
  assert.equal(isSharedImageUrl('blob:http://localhost/123'), false)
  assert.equal(isSharedImageUrl('__indexeddb_background_image__'), false)
  assert.equal(isSharedImageUrl(''), false)
  assert.equal(isSharedImageUrl('javascript:alert(1)'), false)
})

test('untouched defaults are not worth seeding', () => {
  assert.equal(isUntouchedPrefs(createDefaultBackgroundSettings(), ''), true)
  assert.equal(isUntouchedPrefs(prefs({ cardSize: 2 }), ''), false)
  assert.equal(isUntouchedPrefs(createDefaultBackgroundSettings(), 'dark'), false)
  assert.equal(isUntouchedPrefs(prefs({ imageUrl: 'https://example.com/bg.jpg', enabled: true }), ''), false)
})

test('local media keeps the previously shared image url', () => {
  const previous = createSyncRecord({
    settings: prefs({ imageUrl: 'https://example.com/old.jpg', enabled: true, cardSize: 1 }),
    theme: 'dark',
    previous: null,
    shareImage: true,
    now
  }).record

  const next = createSyncRecord({
    settings: prefs({ imageUrl: 'data:image/png;base64,abc', enabled: true, cardSize: 2 }),
    theme: 'dark',
    previous,
    shareImage: false,
    now: () => 2_000
  })

  assert.equal(next.changed, true)
  assert.equal(next.record.imageUrl, 'https://example.com/old.jpg')
  assert.equal(next.record.imageRev, previous.imageRev)
  assert.equal(next.record.cardSize, 2)
  assert.ok(next.record.rev > previous.rev)
})

test('a new https url replaces the shared image and a clear removes it', () => {
  const first = createSyncRecord({
    settings: prefs({ imageUrl: 'https://example.com/a.jpg', enabled: true }),
    theme: '',
    previous: null,
    shareImage: true,
    now
  }).record

  const replaced = createSyncRecord({
    settings: prefs({ imageUrl: 'https://example.com/b.jpg', enabled: true }),
    theme: '',
    previous: first,
    shareImage: true,
    now: () => 2_000
  }).record

  assert.equal(replaced.imageUrl, 'https://example.com/b.jpg')
  assert.ok(replaced.imageRev > first.imageRev)

  const cleared = createSyncRecord({
    settings: prefs({ imageUrl: '', enabled: false }),
    theme: '',
    previous: replaced,
    shareImage: true,
    now: () => 3_000
  }).record

  assert.equal(cleared.imageUrl, '')
  assert.equal(cleared.enabled, false)
  assert.ok(cleared.imageRev > replaced.imageRev)
})

test('identical prefs are not written again', () => {
  const first = createSyncRecord({
    settings: prefs({ cardSize: 1, latinFont: 'plex', cjkFont: 'noto' }),
    theme: 'light',
    previous: null,
    shareImage: true,
    now
  })
  const second = createSyncRecord({
    settings: prefs({ cardSize: 1, latinFont: 'plex', cjkFont: 'noto' }),
    theme: 'light',
    previous: first.record,
    shareImage: true,
    now: () => 2_000
  })

  assert.equal(first.changed, true)
  assert.equal(second.changed, false)
  assert.equal(second.record, first.record)
})

test('newer appearance does not replace a local image when the shared image revision is unchanged', () => {
  const plan = planSyncApply({
    record: {
      theme: '',
      cardSize: 3,
      latinFont: 'inter',
      cjkFont: 'noto',
      cardOpacity: 0.6,
      cardRadius: 8,
      tabRadius: 6,
      enabled: true,
      position: 'top left',
      size: 'contain',
      repeat: 'no-repeat',
      imageUrl: 'https://example.com/bg.jpg',
      imageRev: 10,
      rev: 20
    },
    cursor: { rev: 10, imageRev: 10 }
  })

  assert.equal(plan.image, null)
  assert.equal(plan.theme, null)
  assert.equal(plan.appearance.cardSize, 3)
  assert.equal(plan.appearance.cardOpacity, 0.6)
  assert.equal(plan.appearance.position, 'top left')
  assert.deepEqual(plan.cursor, { rev: 20, imageRev: 10 })
})

test('a newer shared image url is applied and an empty one clears', () => {
  const urlPlan = planSyncApply({
    record: {
      theme: 'dark',
      enabled: true,
      imageUrl: 'https://cdn.example/bg.webp',
      imageRev: 30,
      rev: 30
    },
    cursor: { rev: 20, imageRev: 20 }
  })

  assert.equal(urlPlan.theme, 'dark')
  assert.deepEqual(urlPlan.image, { mode: 'url', imageUrl: 'https://cdn.example/bg.webp' })

  const clearPlan = planSyncApply({
    record: {
      theme: 'light',
      enabled: false,
      imageUrl: '',
      imageRev: 40,
      rev: 40
    },
    cursor: { rev: 30, imageRev: 30 }
  })

  assert.equal(clearPlan.theme, 'light')
  assert.deepEqual(clearPlan.image, { mode: 'clear' })
})

test('stale or blank sync records are ignored', () => {
  const record = {
    theme: 'dark',
    imageUrl: 'https://example.com/bg.jpg',
    imageRev: 5,
    rev: 5
  }

  assert.equal(planSyncApply({ record, cursor: { rev: 5, imageRev: 5 } }), null)
  assert.equal(planSyncApply({ record, cursor: { rev: 8, imageRev: 8 } }), null)
  assert.equal(planSyncApply({ record: { theme: 'dark' }, cursor: { rev: 0, imageRev: 0 } }), null)
  assert.equal(planSyncApply({
    record: { ...record, rev: 9, theme: '' },
    cursor: { rev: 5, imageRev: 9 }
  }).theme, null)
})

test('cursor round-trips through storage', () => {
  const store = new Map()
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  }

  assert.deepEqual(readCursor(storage), { rev: 0, imageRev: 0 })
  writeCursor(storage, { rev: 4, imageRev: 2 })
  assert.equal(store.has(SYNC_CURSOR_KEY), true)
  assert.deepEqual(readCursor(storage), { rev: 4, imageRev: 2 })
  storage.setItem(SYNC_CURSOR_KEY, '{')
  assert.deepEqual(readCursor(storage), { rev: 0, imageRev: 0 })
})
