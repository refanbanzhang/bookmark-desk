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
  assert.equal(catalog.items[0].thumbUrl, catalog.items[0].url)
  assert.equal(catalog.items[0].type, 'image')
  assert.equal(catalog.items[1].type, 'video')
  assert.equal(catalog.items[1].title, 'loop')
  assert.equal(catalog.items[1].thumbUrl, catalog.items[1].url)
  assert.equal(catalog.items[2].title, 'plain')
  assert.equal(catalog.items[2].type, 'image')
  assert.equal(catalog.items[2].thumbUrl, catalog.items[2].url)
})

test('uses catalog thumb for gallery preview and keeps the full wallpaper url', () => {
  const catalog = parseWallpaperCatalog(
    {
      items: [
        {
          path: 'wallpapers/夜山.jpg',
          thumb: 'wallpapers/thumbs/夜山.webp',
          type: 'image'
        },
        {
          path: 'wallpapers/风景 - 自然山脉.jpg',
          thumb: 'wallpapers/thumbs/风景 - 自然山脉.webp',
          type: 'image'
        },
        {
          path: 'wallpapers/loop.mp4',
          type: 'video'
        },
        {
          path: 'wallpapers/empty.jpg',
          thumb: '   '
        }
      ]
    },
    JSDELIVR.mediaBase
  )

  const [night, mountain, loop, empty] = catalog.items

  assert.equal(night.url, `${JSDELIVR.mediaBase}wallpapers/${encodeURIComponent('夜山.jpg')}`)
  assert.equal(
    night.thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/${encodeURIComponent('夜山.webp')}`
  )
  assert.notEqual(night.thumbUrl, night.url)
  assert.equal(
    mountain.thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/${encodeURIComponent('风景 - 自然山脉.webp')}`
  )
  assert.equal(loop.url, `${JSDELIVR.mediaBase}wallpapers/loop.mp4`)
  assert.equal(loop.thumbUrl, loop.url)
  assert.equal(empty.thumbUrl, empty.url)
  assert.equal(empty.url, `${JSDELIVR.mediaBase}wallpapers/empty.jpg`)
})

test('loads jsDelivr first and falls back to GitHub raw', async () => {
  const catalog = {
    updatedAt: '2026-10-27T00:00:00.000Z',
    items: [{ path: 'wallpapers/a.jpg', name: 'a.jpg', title: 'A', type: 'image', thumb: 'wallpapers/thumbs/a.webp' }]
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
  assert.equal(loaded.items[0].thumbUrl, `${GITHUB.mediaBase}wallpapers/thumbs/a.webp`)
})

test('skips a stale jsDelivr catalog that has no thumb fields', async () => {
  const stale = {
    updatedAt: '2026-10-27T03:10:38Z',
    items: [{ path: 'wallpapers/a.jpg', name: 'a.jpg', title: 'A', type: 'image' }]
  }
  const fresh = {
    updatedAt: '2026-10-27T04:04:51Z',
    items: [{
      path: 'wallpapers/a.jpg',
      name: 'a.jpg',
      title: 'A',
      type: 'image',
      thumb: 'wallpapers/thumbs/a.webp'
    }]
  }
  const seen = []
  const fetchImpl = async (url) => {
    seen.push(url)
    if (url === JSDELIVR.catalogUrl) {
      return jsonResponse(stale)
    }
    return jsonResponse(fresh)
  }

  const loaded = await loadWallpaperCatalog(fetchImpl)
  assert.deepEqual(seen, [JSDELIVR.catalogUrl, GITHUB.catalogUrl])
  assert.equal(loaded.items[0].url, `${GITHUB.mediaBase}wallpapers/a.jpg`)
  assert.equal(loaded.items[0].thumbUrl, `${GITHUB.mediaBase}wallpapers/thumbs/a.webp`)
})

test('keeps jsDelivr when it already has thumb fields', async () => {
  const seen = []
  const loaded = await loadWallpaperCatalog(async (url) => {
    seen.push(url)
    return jsonResponse({
      items: [{ path: 'wallpapers/a.jpg', type: 'image', thumb: 'wallpapers/thumbs/a.webp' }]
    })
  })

  assert.deepEqual(seen, [JSDELIVR.catalogUrl])
  assert.equal(loaded.items[0].thumbUrl, `${JSDELIVR.mediaBase}wallpapers/thumbs/a.webp`)
})

test('keeps the stale catalog when every host lacks thumbs', async () => {
  const loaded = await loadWallpaperCatalog(async () => jsonResponse({
    items: [{ path: 'wallpapers/a.jpg', type: 'image' }]
  }))
  assert.equal(loaded.items[0].url, `${JSDELIVR.mediaBase}wallpapers/a.jpg`)
  assert.equal(loaded.items[0].thumbUrl, loaded.items[0].url)
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
