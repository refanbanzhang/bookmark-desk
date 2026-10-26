import { RECENT_VISITS_KEY, RECENT_VISITS_LIMIT } from '../constants.js'
import { hasChildren } from './bookmarkTree.js'

export const rememberVisit = (visits = [], node, now = Date.now()) => {
  if (!node?.url || node.id === undefined || node.id === null || node.id === '') {
    return Array.isArray(visits) ? visits : []
  }

  const next = [
    {
      id: String(node.id),
      url: String(node.url),
      title: node.title || '',
      visitedAt: now
    },
    ...(Array.isArray(visits) ? visits : []).filter((item) => String(item?.id) !== String(node.id))
  ]
  return next.slice(0, RECENT_VISITS_LIMIT)
}

export const readVisits = (storage = globalThis.localStorage) => {
  try {
    const parsed = JSON.parse(storage?.getItem?.(RECENT_VISITS_KEY) || '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item) => item && item.id && item.url)
      .slice(0, RECENT_VISITS_LIMIT)
  } catch {
    return []
  }
}

export const writeVisits = (visits, storage = globalThis.localStorage) => {
  storage?.setItem?.(RECENT_VISITS_KEY, JSON.stringify(visits))
}

/**
 * 按访问顺序还原仍存在的书签。加密目录里的书签在解锁前不出现。
 */
export const resolveRecentVisits = (visits = [], nodes = [], hiddenFolderIds = new Set()) => {
  const visible = new Map()
  const walk = (list, blocked) => {
    for (const node of list || []) {
      const hideChildren = blocked || hiddenFolderIds.has(String(node.id))
      if (!blocked && node?.url) {
        visible.set(String(node.id), node)
      }
      if (hasChildren(node) && !hideChildren) {
        walk(node.children, false)
      }
    }
  }
  walk(nodes, false)

  const seen = new Set()
  const result = []
  for (const item of visits) {
    const node = visible.get(String(item?.id))
    if (!node || seen.has(String(node.id))) {
      continue
    }
    seen.add(String(node.id))
    result.push(node)
  }
  return result
}
