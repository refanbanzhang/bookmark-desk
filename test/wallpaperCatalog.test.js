import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WALLPAPER_CDN_SOURCES,
  inferMediaType,
  loadWallpaperCatalog,
  parseWallpaperCatalog,
  wallpaperMediaUrl
} from '../src/utils/wallpaperCatalog.js'

const JSDELIVR = WALLPAPER_CDN_SOURCES[0]
const GITHUB = WALLPAPER_CDN_SOURCES[1]

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data
})

test('encodes each path segment so Chinese filenames stay valid urls', () => {
  assert.equal(
    wallpaperMediaUrl('wallpapers/夜山.jpg', JSDELIVR.mediaBase),
    `${JSDELIVR.mediaBase}wallpapers/${encodeURIComponent('夜山.jpg')}`
  )
  assert.equal(wallpaperMediaUrl('', JSDELIVR.mediaBase), '')
  assert.equal(wallpaperMediaUrl('/wallpapers//a.jpg', JSDELIVR.mediaBase), `${JSDELIVR.mediaBase}wallpapers/a.jpg`)
})

test('infers image or video from an explicit type or a file url', () => {
  assert.equal(inferMediaType('video'), 'video')
  assert.equal(inferMediaType('image'), 'image')
  assert.equal(inferMediaType('https://cdn.example/a.mp4'), 'video')
  assert.equal(inferMediaType('wallpapers/loop.webm?v=1'), 'video')
  assert.equal(inferMediaType('https://cdn.example/a.jpg'), 'image')
})

test('parses catalog items and skips entries without a path', () => {
  const catalog = parseWallpaperCatalog(
    {
      updatedAt: '2026-10-27T00:00:00.000Z',
      items: [
        { path: 'wallpapers/夜山.jpg', name: '夜山.jpg', title: '夜山', type: 'image' },
        { path: 'wallpapers/loop.mp4', name: 'loop.mp4', type: 'video' },
        { path: 'wallpapers/plain.png' },
        { name: 'missing-path.jpg', type: 'image' }
      ]
    },
    JSDELIVR.mediaBase
  )

  assert.equal(catalog.updatedAt, '2026-10-27T00:00:00.000Z')
  assert.equal(catalog.items.length, 3)
  assert.equal(catalog.items[0].url, `${JSDELIVR.mediaBase}wallpapers/${encodeURIComponent('夜山.jpg')}`)
  assert.equal(catalog.items[0].type, 'image')
  assert.equal(catalog.items[1].type, 'video')
  assert.equal(catalog.items[1].title, 'loop')
  assert.equal(catalog.items[2].title, 'plain')
  assert.equal(catalog.items[2].type, 'image')
})

test('loads jsDelivr first and falls back to GitHub raw', async () => {
  const catalog = {
    updatedAt: '2026-10-27T00:00:00.000Z',
    items: [{ path: 'wallpapers/a.jpg', name: 'a.jpg', title: 'A', type: 'image' }]
  }
  const seen = []
  const fetchImpl = async (url) => {
    seen.push(url)
    if (url === JSDELIVR.catalogUrl) {
      return jsonResponse({}, 404)
    }
    assert.equal(url, GITHUB.catalogUrl)
    return jsonResponse(catalog)
  }

  const loaded = await loadWallpaperCatalog(fetchImpl)
  assert.deepEqual(seen, [JSDELIVR.catalogUrl, GITHUB.catalogUrl])
  assert.equal(loaded.items[0].url, `${GITHUB.mediaBase}wallpapers/a.jpg`)
})

test('returns an empty gallery when the catalog has no usable items', async () => {
  const loaded = await loadWallpaperCatalog(async () => jsonResponse({ items: [] }))
  assert.deepEqual(loaded.items, [])
})

test('throws when every catalog host fails', async () => {
  await assert.rejects(
    () => loadWallpaperCatalog(async () => jsonResponse({}, 503)),
    /预设壁纸目录加载失败/
  )
})
