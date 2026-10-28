import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WALLPAPER_CDN_SOURCES,
  WALLPAPER_LIST_URL,
  WALLPAPER_REF_URL,
  catalogFromDirectory,
  inferMediaType,
  loadWallpaperCatalog,
  parseWallpaperCatalog,
  sameWallpaper,
  wallpaperMediaBase,
  wallpaperMediaUrl,
  wallpaperThumbsUrl
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
  assert.equal(
    catalog.items[0].thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/${encodeURIComponent('夜山.webp')}`
  )
  assert.notEqual(catalog.items[0].thumbUrl, catalog.items[0].url)
  assert.equal(catalog.items[0].type, 'image')
  const loop = catalog.items.find((item) => item.name === 'loop.mp4')
  assert.equal(loop.type, 'video')
  assert.equal(loop.url, `${JSDELIVR.mediaBase}wallpapers/loop.mp4`)
  assert.equal(loop.thumbUrl, `${JSDELIVR.mediaBase}wallpapers/thumbs/loop.webp`)
  assert.notEqual(loop.thumbUrl, loop.url)
  assert.equal(catalog.items[2].title, 'plain')
  assert.equal(catalog.items[2].type, 'image')
  assert.equal(
    catalog.items[2].thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/plain.webp`
  )
  assert.notEqual(catalog.items[2].thumbUrl, catalog.items[2].url)
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

  assert.equal(catalog.items.length, 4)
  const [night, mountain, loop, empty] = catalog.items
  assert.equal(loop.type, 'video')
  assert.equal(loop.url, `${JSDELIVR.mediaBase}wallpapers/loop.mp4`)
  assert.equal(loop.thumbUrl, `${JSDELIVR.mediaBase}wallpapers/thumbs/loop.webp`)
  assert.notEqual(loop.thumbUrl, loop.url)

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
  assert.equal(
    empty.thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/empty.webp`
  )
  assert.notEqual(empty.thumbUrl, empty.url)
  assert.equal(empty.url, `${JSDELIVR.mediaBase}wallpapers/empty.jpg`)
})

const SHA = 'a'.repeat(40)
const directory = [
  { type: 'file', name: 'index.json' },
  { type: 'dir', name: 'thumbs' },
  { type: 'file', name: '夜山.jpg' },
  { type: 'file', name: 'loop.mp4' },
  { type: 'file', name: 'notes.txt' }
]
const thumbs = [
  { type: 'file', name: '夜山.webp' },
  { type: 'file', name: 'loop.webp' }
]

const directoryFetch = (entries, { sha = SHA, thumbStatus = 200, refStatus = 200 } = {}) => {
  const seen = []
  const fetchImpl = async (url) => {
    seen.push(url)
    if (url === WALLPAPER_LIST_URL) {
      return jsonResponse(entries)
    }
    if (url === WALLPAPER_REF_URL) {
      return jsonResponse({ object: { sha } }, refStatus)
    }
    if (url === wallpaperThumbsUrl(sha)) {
      return jsonResponse(thumbs, thumbStatus)
    }
    throw new Error(`unexpected ${url}`)
  }
  return { seen, fetchImpl }
}

const failIndexesThen = (fetchImpl) => async (url) => {
  if (url === JSDELIVR.catalogUrl || url === GITHUB.catalogUrl) {
    return jsonResponse({}, 503)
  }
  return fetchImpl(url)
}

test('loads the gallery from jsDelivr index.json and never calls GitHub API', async () => {
  const seen = []
  const loaded = await loadWallpaperCatalog(async (url) => {
    seen.push(url)
    if (url === JSDELIVR.catalogUrl) {
      return jsonResponse({
        items: [
          { path: 'wallpapers/夜山.jpg', name: '夜山.jpg', type: 'image', thumb: 'wallpapers/thumbs/夜山.webp' },
          { path: 'wallpapers/loop.mp4', name: 'loop.mp4', type: 'video', thumb: 'wallpapers/thumbs/loop.webp' }
        ]
      })
    }
    throw new Error(`unexpected ${url}`)
  })
  const night = loaded.items.find((item) => item.name === '夜山.jpg')

  assert.deepEqual(seen, [JSDELIVR.catalogUrl])
  assert.equal(loaded.items.length, 2)
  assert.equal(night.url, `${JSDELIVR.mediaBase}wallpapers/${encodeURIComponent('夜山.jpg')}`)
  assert.equal(
    night.thumbUrl,
    `${JSDELIVR.mediaBase}wallpapers/thumbs/${encodeURIComponent('夜山.webp')}`
  )
  assert.notEqual(night.thumbUrl, night.url)
  const loop = loaded.items.find((item) => item.name === 'loop.mp4')
  assert.equal(loop.type, 'video')
  assert.equal(loop.url, `${JSDELIVR.mediaBase}wallpapers/loop.mp4`)
  assert.equal(loop.thumbUrl, `${JSDELIVR.mediaBase}wallpapers/thumbs/loop.webp`)
  assert.notEqual(loop.thumbUrl, loop.url)
})

test('builds the gallery from the wallpaper directory after both indexes fail', async () => {
  const { seen, fetchImpl } = directoryFetch(directory)
  const loaded = await loadWallpaperCatalog(async (url) => {
    if (url === JSDELIVR.catalogUrl || url === GITHUB.catalogUrl) {
      seen.push(url)
      return jsonResponse({}, 503)
    }
    return fetchImpl(url)
  })
  const night = loaded.items.find((item) => item.name === '夜山.jpg')

  assert.deepEqual(seen, [
    JSDELIVR.catalogUrl,
    GITHUB.catalogUrl,
    WALLPAPER_LIST_URL,
    WALLPAPER_REF_URL,
    wallpaperThumbsUrl(SHA)
  ])
  assert.equal(loaded.items.length, 2)
  assert.equal(night.url, `${wallpaperMediaBase(SHA)}wallpapers/${encodeURIComponent('夜山.jpg')}`)
  assert.equal(night.thumbUrl, `${wallpaperMediaBase(SHA)}wallpapers/thumbs/${encodeURIComponent('夜山.webp')}`)
  const loop = loaded.items.find((item) => item.name === 'loop.mp4')
  assert.equal(loop.type, 'video')
  assert.equal(loop.url, `${wallpaperMediaBase(SHA)}wallpapers/loop.mp4`)
  assert.equal(loop.thumbUrl, `${wallpaperMediaBase(SHA)}wallpapers/thumbs/loop.webp`)
  assert.notEqual(loop.thumbUrl, loop.url)
  assert.equal(loaded.items.some((item) => item.name === 'index.json'), false)
})

test('a later directory listing adds and drops files without index.json', () => {
  const before = catalogFromDirectory(
    [{ type: 'file', name: '旧图.jpg' }, { type: 'file', name: '留下.jpg' }],
    [{ type: 'file', name: '旧图.webp' }, { type: 'file', name: '留下.webp' }],
    wallpaperMediaBase(SHA)
  )
  const after = catalogFromDirectory(
    [{ type: 'file', name: '留下.jpg' }, { type: 'file', name: '新图.png' }],
    [{ type: 'file', name: '留下.webp' }],
    wallpaperMediaBase(SHA)
  )

  assert.deepEqual(before.items.map((item) => item.name), ['旧图.jpg', '留下.jpg'])
  assert.deepEqual(after.items.map((item) => item.name), ['留下.jpg', '新图.png'])
  assert.equal(
    after.items[1].thumbUrl,
    `${wallpaperMediaBase(SHA)}wallpapers/thumbs/${encodeURIComponent('新图.webp')}`
  )
  assert.notEqual(after.items[1].thumbUrl, after.items[1].url)
})

test('keeps an empty gallery when only the directory listing is empty', async () => {
  const { fetchImpl } = directoryFetch([])
  const loaded = await loadWallpaperCatalog(failIndexesThen(fetchImpl))
  assert.deepEqual(loaded.items, [])
})

test('still lists files when the commit lookup or thumbs folder fails', async () => {
  const { fetchImpl } = directoryFetch(directory, { refStatus: 403, thumbStatus: 404, sha: SHA })
  const loaded = await loadWallpaperCatalog(failIndexesThen(async (url) => {
    if (url === WALLPAPER_REF_URL) {
      return jsonResponse({}, 403)
    }
    if (url === wallpaperThumbsUrl(SHA) || url === wallpaperThumbsUrl('main')) {
      return jsonResponse({}, 404)
    }
    return fetchImpl(url)
  }))

  assert.equal(loaded.items.length, 2)
  const night = loaded.items.find((item) => item.name === '夜山.jpg')
  assert.equal(night.url.startsWith(wallpaperMediaBase()), true)
  assert.equal(night.thumbUrl, `${wallpaperMediaBase()}wallpapers/thumbs/${encodeURIComponent('夜山.webp')}`)
  assert.notEqual(night.thumbUrl, night.url)
  const loop = loaded.items.find((item) => item.name === 'loop.mp4')
  assert.equal(loop.type, 'video')
  assert.equal(loop.thumbUrl, `${wallpaperMediaBase()}wallpapers/thumbs/loop.webp`)
  assert.notEqual(loop.thumbUrl, loop.url)
})

test('falls back to GitHub raw index.json when jsDelivr fails', async () => {
  const seen = []
  const loaded = await loadWallpaperCatalog(async (url) => {
    seen.push(url)
    if (url === JSDELIVR.catalogUrl) {
      return jsonResponse({}, 503)
    }
    if (url === GITHUB.catalogUrl) {
      return jsonResponse({
        items: [{ path: 'wallpapers/a.jpg', type: 'image', thumb: 'wallpapers/thumbs/a.webp' }]
      })
    }
    throw new Error(`unexpected ${url}`)
  })

  assert.deepEqual(seen, [JSDELIVR.catalogUrl, GITHUB.catalogUrl])
  assert.equal(loaded.items[0].url, `${GITHUB.mediaBase}wallpapers/a.jpg`)
  assert.equal(loaded.items[0].thumbUrl, `${GITHUB.mediaBase}wallpapers/thumbs/a.webp`)
})

test('directory API rate-limit JSON is not surfaced after index hosts fail', async () => {
  const rateLimit = {
    message: 'API rate limit exceeded for 85.211.247.0. (But here\'s the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)',
    documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
  }

  await assert.rejects(
    () => loadWallpaperCatalog(async (url) => {
      if (url === JSDELIVR.catalogUrl || url === GITHUB.catalogUrl) {
        return jsonResponse({}, 503)
      }
      return {
        ok: false,
        status: 403,
        json: async () => rateLimit
      }
    }),
    (error) => {
      assert.match(error.message, /预设壁纸目录加载失败/)
      assert.doesNotMatch(error.message, /rate limit/i)
      assert.doesNotMatch(error.message, /85\.211\.247\.0/)
      assert.equal(error.message.includes(rateLimit.message), false)
      return true
    }
  )
})

test('matches a saved wallpaper across commit and branch urls', () => {
  const item = {
    path: 'wallpapers/夜山.jpg',
    url: `${wallpaperMediaBase(SHA)}wallpapers/${encodeURIComponent('夜山.jpg')}`
  }
  const saved = `${JSDELIVR.mediaBase}wallpapers/${encodeURIComponent('夜山.jpg')}`

  assert.equal(sameWallpaper(saved, item), true)
  assert.equal(sameWallpaper(item.url, item), true)
  assert.equal(sameWallpaper(`${JSDELIVR.mediaBase}wallpapers/other.jpg`, item), false)
  assert.equal(sameWallpaper('not a url', item), false)
})

test('throws when the directory API and both index hosts fail', async () => {
  await assert.rejects(
    () => loadWallpaperCatalog(async () => jsonResponse({}, 503)),
    /预设壁纸目录加载失败/
  )
})
