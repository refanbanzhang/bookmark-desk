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
const ABSOLUTE_MEDIA = /^(https?:\/\/|data:)/i

/*
 * cdn-images / wallpapers/index.json 约定：
 *   path   必填，仓库相对路径，选中后用作全分辨率壁纸
 *   thumb  可选，轻量预览：仓库相对路径（如 wallpapers/thumbs/foo.webp）
 *          或 http(s)/data 绝对地址
 *
 * thumb 别名（第一个非空生效）：thumbPath、thumbUrl、thumbnail、preview、poster
 * 没有 thumb 时画廊回退到 path 的全图 URL，不要猜测 thumbs/ 目录。
 */
const THUMB_FIELDS = ['thumb', 'thumbPath', 'thumbUrl', 'thumbnail', 'preview', 'poster']

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

export const resolveCatalogMediaUrl = (value, mediaBase) => {
  const trimmed = trimText(value)
  if (!trimmed) {
    return ''
  }

  return ABSOLUTE_MEDIA.test(trimmed) ? trimmed : wallpaperMediaUrl(trimmed, mediaBase)
}

export const pickCatalogThumb = (item) => {
  for (const field of THUMB_FIELDS) {
    const value = trimText(item?.[field])
    if (value) {
      return value
    }
  }

  return ''
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
    const resolvedThumb = resolveCatalogMediaUrl(pickCatalogThumb(item), mediaBase)
    const thumbUrl = resolvedThumb || url

    parsed.push({
      path,
      name: trimText(item?.name) || path.split('/').pop() || path,
      title: itemTitle(item, path),
      type,
      url,
      thumbUrl,
      posterUrl: type === 'video' && resolvedThumb ? resolvedThumb : ''
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

  for (const source of WALLPAPER_CDN_SOURCES) {
    try {
      const response = await fetchImpl(source.catalogUrl)
      if (!response?.ok) {
        lastError = new Error(`预设壁纸目录加载失败（${response?.status || 0}）。`)
        continue
      }

      return parseWallpaperCatalog(await response.json(), source.mediaBase)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('预设壁纸目录加载失败。')
    }
  }

  throw lastError || new Error('预设壁纸目录加载失败。')
}
