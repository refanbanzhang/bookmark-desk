export const WALLPAPER_CDN_SOURCES = [
  {
    id: 'jsdelivr',
    catalogUrl: 'https://cdn.jsdelivr.net/gh/refanbanzhang/cdn-images@main/wallpapers/index.json',
    mediaBase: 'https://cdn.jsdelivr.net/gh/refanbanzhang/cdn-images@main/'
  },
  {
    id: 'github',
    catalogUrl: 'https://raw.githubusercontent.com/refanbanzhang/cdn-images/main/wallpapers/index.json',
    mediaBase: 'https://raw.githubusercontent.com/refanbanzhang/cdn-images/main/'
  }
]

const VIDEO_EXT = /\.(mp4|webm|ogv|mov)(\?|#|$)/i

/*
 * cdn-images / wallpapers/index.json：
 *   path   必填，全分辨率壁纸，仓库相对路径
 *   thumb  可选，仅图片。形如 wallpapers/thumbs/<与 path 同名>.webp
 *          和 path 走同一 mediaBase。视频没有这个字段。
 * 缺 thumb 或为空时，画廊回退到 path 的全图 URL，不要猜测 thumbs/ 目录。
 * jsDelivr 若仍吐出整份都没有 thumb 的旧 index.json，当作过期，改试下一个源。
 */

const catalogHasThumbs = (catalog) =>
  catalog.items.some((item) => item.thumbUrl !== item.url)
const trimText = (value) => (typeof value === 'string' ? value.trim() : '')

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

  return name.replace(/\.[^.]+$/, '') || name
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
    const thumbUrl = wallpaperMediaUrl(trimText(item?.thumb), mediaBase) || url

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

export const loadWallpaperCatalog = async (fetchImpl = globalThis.fetch) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('预设壁纸目录加载失败。')
  }

  let lastError = null
  let staleCatalog = null

  for (const source of WALLPAPER_CDN_SOURCES) {
    try {
      const response = await fetchImpl(source.catalogUrl)
      if (!response?.ok) {
        lastError = new Error(`预设壁纸目录加载失败（${response?.status || 0}）。`)
        continue
      }

      const catalog = parseWallpaperCatalog(await response.json(), source.mediaBase)
      if (!catalog.items.length || catalogHasThumbs(catalog)) {
        return catalog
      }

      if (!staleCatalog) {
        staleCatalog = catalog
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('预设壁纸目录加载失败。')
    }
  }

  if (staleCatalog) {
    return staleCatalog
  }

  throw lastError || new Error('预设壁纸目录加载失败。')
}
