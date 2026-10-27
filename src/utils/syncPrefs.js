import { THEME_KEY } from '../constants.js'
import { createDefaultBackgroundSettings } from './backgroundSettings.js'

export const SYNC_PREFS_KEY = 'bookmark-desk-prefs'
export const SYNC_CURSOR_KEY = 'bookmark-sync-cursor'

const emptyCursor = () => ({ rev: 0, imageRev: 0 })

export const isSharedImageUrl = (url) => {
  if (typeof url !== 'string') {
    return false
  }

  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const explicitTheme = (storage = globalThis.localStorage) => {
  const saved = storage?.getItem?.(THEME_KEY)
  return saved === 'dark' || saved === 'light' ? saved : ''
}

const APPEARANCE_KEYS = [
  'cardSize',
  'latinFont',
  'cjkFont',
  'cardOpacity',
  'cardRadius',
  'tabRadius',
  'enabled',
  'position',
  'size',
  'repeat'
]

/** 没手动改过的默认值不往账号上写，避免一台全新的浏览器覆盖另一台已经调好的设置 */
export const isUntouchedPrefs = (settings, theme) => {
  if (theme === 'dark' || theme === 'light') {
    return false
  }
  if (isSharedImageUrl(settings?.imageUrl)) {
    return false
  }

  const defaults = createDefaultBackgroundSettings()
  return APPEARANCE_KEYS.every((key) => settings?.[key] === defaults[key])
}

export const isSyncRecord = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Number(value.rev) > 0

export const readCursor = (storage = globalThis.localStorage) => {
  try {
    const parsed = JSON.parse(storage?.getItem?.(SYNC_CURSOR_KEY) || '')
    const rev = Number(parsed?.rev)
    const imageRev = Number(parsed?.imageRev)
    return {
      rev: Number.isFinite(rev) ? rev : 0,
      imageRev: Number.isFinite(imageRev) ? imageRev : 0
    }
  } catch {
    return emptyCursor()
  }
}

export const writeCursor = (storage, cursor) => {
  storage?.setItem?.(
    SYNC_CURSOR_KEY,
    JSON.stringify({
      rev: Number(cursor?.rev) || 0,
      imageRev: Number(cursor?.imageRev) || 0
    })
  )
}

const sameBody = (left, right) =>
  left.theme === right.theme &&
  left.cardSize === right.cardSize &&
  left.latinFont === right.latinFont &&
  left.cjkFont === right.cjkFont &&
  left.cardOpacity === right.cardOpacity &&
  left.cardRadius === right.cardRadius &&
  left.tabRadius === right.tabRadius &&
  left.enabled === right.enabled &&
  left.position === right.position &&
  left.size === right.size &&
  left.repeat === right.repeat &&
  left.imageUrl === right.imageUrl &&
  left.imageRev === right.imageRev

/**
 * 把本机显示偏好投影成一条同步记录。
 * shareImage 为 false 时保留上一次的共享图片地址，本地上传不会把别的设备的网址清掉。
 */
export const createSyncRecord = ({
  settings,
  theme,
  previous,
  shareImage,
  now = Date.now
}) => {
  const prev = isSyncRecord(previous) ? previous : null
  const stamp = (value) => Math.max(now(), (Number(value) || 0) + 1)
  let imageUrl = prev && isSharedImageUrl(prev.imageUrl) ? prev.imageUrl.trim() : ''
  let imageRev = prev ? Number(prev.imageRev) || 0 : 0

  if (shareImage) {
    const nextUrl = isSharedImageUrl(settings?.imageUrl) ? settings.imageUrl.trim() : ''
    if (nextUrl !== imageUrl) {
      imageUrl = nextUrl
      imageRev = stamp(imageRev)
    }
  }

  const record = {
    theme: theme === 'dark' || theme === 'light' ? theme : '',
    cardSize: settings?.cardSize,
    latinFont: settings?.latinFont,
    cjkFont: settings?.cjkFont,
    cardOpacity: settings?.cardOpacity,
    cardRadius: settings?.cardRadius,
    tabRadius: settings?.tabRadius,
    enabled: Boolean(settings?.enabled),
    position: settings?.position || 'center center',
    size: settings?.size || 'contain',
    repeat: settings?.repeat || 'no-repeat',
    imageUrl,
    imageRev,
    rev: prev ? Number(prev.rev) || 0 : 0
  }

  if (prev && sameBody(prev, record)) {
    return { record: prev, changed: false }
  }

  record.rev = stamp(record.rev)
  return { record, changed: true }
}

/**
 * 远端比本机光标新才应用。图片版本没变时，不碰本机正在用的背景。
 */
export const planSyncApply = ({ record, cursor }) => {
  if (!isSyncRecord(record)) {
    return null
  }

  const current = {
    rev: Number(cursor?.rev) || 0,
    imageRev: Number(cursor?.imageRev) || 0
  }
  const rev = Number(record.rev) || 0
  const imageRev = Number(record.imageRev) || 0
  if (rev <= current.rev && imageRev <= current.imageRev) {
    return null
  }

  const appearance = {}
  if (rev > current.rev) {
    for (const key of APPEARANCE_KEYS) {
      if (record[key] !== undefined) {
        appearance[key] = key === 'enabled' ? Boolean(record[key]) : record[key]
      }
    }
  }

  let image = null
  if (imageRev > current.imageRev) {
    image = isSharedImageUrl(record.imageUrl)
      ? { mode: 'url', imageUrl: record.imageUrl.trim() }
      : { mode: 'clear' }
  }

  return {
    appearance: Object.keys(appearance).length ? appearance : null,
    image,
    theme: rev > current.rev && (record.theme === 'light' || record.theme === 'dark') ? record.theme : null,
    cursor: {
      rev: Math.max(current.rev, rev),
      imageRev: Math.max(current.imageRev, imageRev)
    }
  }
}
