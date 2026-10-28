const REPO = 'refanbanzhang/cdn-images'
const BRANCH = 'main'
const WALLPAPER_DIR = 'wallpapers'

export const WALLPAPER_REF_URL =
  `https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}`
export const WALLPAPER_LIST_URL =
  `https://api.github.com/repos/${REPO}/contents/${WALLPAPER_DIR}?ref=${BRANCH}`

export const wallpaperThumbsUrl = (ref = BRANCH) =>
  `https://api.github.com/repos/${REPO}/contents/${WALLPAPER_DIR}/thumbs?ref=${ref}`

/** 钉在具体提交上，避免 jsDelivr 把 @main 缓存成旧文件 */
export const wallpaperMediaBase = (sha = '') =>
  `https://cdn.jsdelivr.net/gh/${REPO}@${sha || BRANCH}/`

export const WALLPAPER_CDN_SOURCES = [
  {
    id: 'jsdelivr',
    catalogUrl: `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/wallpapers/index.json`,
    mediaBase: `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/`
  },
  {
    id: 'github',
    catalogUrl: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/wallpapers/index.json`,
    mediaBase: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`
  }
]

const MEDIA_EXT = /\.(jpe?g|png|gif|webp|avif|mp4|webm|ogv|mov)$/i
const COMMIT_SHA = /^[0-9a-f]{40}$/i
const VIDEO_EXT = /\.(mp4|webm|ogv|mov)(\?|#|$)/i

const trimText = (value) => (typeof value === 'string' ? value.trim() : '')
const fileStem = (name) => name.replace(/\.[^.]+$/, '') || name

const isThumbPath = (value) => value.split('/').filter(Boolean).includes('thumbs')

/** 画廊只认 thumbs/。目录给了真实文件就用它，否则按同名 .webp，绝不回退到原图或视频。 */
const thumbPathFor = (item, path) => {
  const given = trimText(item?.thumb)
  if (isThumbPath(given)) {
    return given
  }

  const name = path.split('/').pop() || path
  return `${WALLPAPER_DIR}/thumbs/${fileStem(name)}.webp`
}

/** 中文文件名按段编码，整段 encode 会把斜杠也吃掉 */
export const wallpaperMediaUrl = (path, mediaBase) => {
  const encoded = String(path || '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')

  return encoded ? `${mediaBase}${encoded}` : ''
}

export const inferMediaType = (value) => {
  if (value === 'video' || value === 'image') {
    return value
  }

  return VIDEO_EXT.test(String(value || '')) ? 'video' : 'image'
}

const itemTitle = (item, path) => {
  const filename = path.split('/').pop() || path
  const name = trimText(item?.name) || filename
  const title = trimText(item?.title)
  if (title) {
    return title
  }

  return fileStem(name)
}

export const parseWallpaperCatalog = (data, mediaBase) => {
  const items = Array.isArray(data?.items) ? data.items : []
  const parsed = []

  for (const item of items) {
    const path = trimText(item?.path)
    const url = wallpaperMediaUrl(path, mediaBase)
    if (!url) {
      continue
    }

    const type = inferMediaType(item?.type || item?.name || path)
    const thumbUrl = wallpaperMediaUrl(thumbPathFor(item, path), mediaBase)

    parsed.push({
      path,
      name: trimText(item?.name) || path.split('/').pop() || path,
      title: itemTitle(item, path),
      type,
      url,
      thumbUrl
    })
  }

  return {
    updatedAt: trimText(data?.updatedAt),
    items: parsed
  }
}

const thumbPaths = (entries) => {
  const paths = new Map()
  if (!Array.isArray(entries)) {
    return paths
  }

  for (const entry of entries) {
    const name = trimText(entry?.name)
    if (entry?.type !== 'file' || !name) {
      continue
    }
    paths.set(fileStem(name), `${WALLPAPER_DIR}/thumbs/${name}`)
  }

  return paths
}

/** 目录里的图片和视频都是壁纸。index.json 和 thumbs 目录本身不是。 */
export const catalogFromDirectory = (entries, thumbEntries, mediaBase) => {
  const thumbs = thumbPaths(thumbEntries)
  const items = []

  for (const entry of Array.isArray(entries) ? entries : []) {
    const name = trimText(entry?.name)
    if (entry?.type !== 'file' || !MEDIA_EXT.test(name)) {
      continue
    }

    const type = inferMediaType(name)
    items.push({
      path: `${WALLPAPER_DIR}/${name}`,
      name,
      type,
      thumb: thumbs.get(fileStem(name)) || ''
    })
  }

  items.sort((left, right) => left.name.localeCompare(right.name, 'zh'))
  return parseWallpaperCatalog({ items }, mediaBase)
}

export const wallpaperFilePath = (url) => {
  const value = trimText(url)
  if (!value) {
    return ''
  }

  try {
    const path = decodeURIComponent(new URL(value).pathname)
    const at = path.indexOf(`/${WALLPAPER_DIR}/`)
    return at === -1 ? '' : path.slice(at + 1)
  } catch {
    return ''
  }
}

export const sameWallpaper = (url, item) => {
  const saved = wallpaperFilePath(url)
  return Boolean(saved && item?.path) && saved === item.path
}

const catalogLoadError = (status) =>
  new Error(`预设壁纸目录加载失败（${status || 0}）。`)

const fetchJson = async (fetchImpl, url) => {
  const githubApi = String(url).startsWith('https://api.github.com/')
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { Accept: githubApi ? 'application/vnd.github+json' : 'application/json' }
  })
  if (!response?.ok) {
    throw catalogLoadError(response?.status)
  }

  return response.json()
}

const commitFromRef = (ref) => {
  const sha = trimText(ref?.object?.sha)
  return COMMIT_SHA.test(sha) ? sha : ''
}

const loadDirectoryCatalog = async (fetchImpl) => {
  const [entries, ref] = await Promise.all([
    fetchJson(fetchImpl, WALLPAPER_LIST_URL),
    fetchJson(fetchImpl, WALLPAPER_REF_URL).catch(() => null)
  ])
  if (!Array.isArray(entries)) {
    throw new Error('预设壁纸目录加载失败。')
  }

  const sha = commitFromRef(ref)
  const hasThumbs = entries.some((entry) => entry?.type === 'dir' && entry?.name === 'thumbs')
  let thumbs = []
  if (hasThumbs) {
    try {
      thumbs = await fetchJson(fetchImpl, wallpaperThumbsUrl(sha || BRANCH))
    } catch {
      thumbs = []
    }
  }

  return catalogFromDirectory(entries, thumbs, wallpaperMediaBase(sha))
}

const loadIndexCatalog = async (fetchImpl) => {
  let lastError = null

  for (const source of WALLPAPER_CDN_SOURCES) {
    try {
      const catalog = parseWallpaperCatalog(
        await fetchJson(fetchImpl, source.catalogUrl),
        source.mediaBase
      )
      if (catalog.items.length) {
        return catalog
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('预设壁纸目录加载失败。')
    }
  }

  throw lastError || new Error('预设壁纸目录加载失败。')
}

/** 主路径只读 CDN index。GitHub Contents API 匿名每 IP 每小时约 60 次，只当最后一招。 */
export const loadWallpaperCatalog = async (fetchImpl = globalThis.fetch) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('预设壁纸目录加载失败。')
  }

  try {
    return await loadIndexCatalog(fetchImpl)
  } catch (error) {
    try {
      return await loadDirectoryCatalog(fetchImpl)
    } catch (fallbackError) {
      if (fallbackError instanceof Error) {
        throw fallbackError
      }
      throw error instanceof Error ? error : new Error('预设壁纸目录加载失败。')
    }
  }
}
