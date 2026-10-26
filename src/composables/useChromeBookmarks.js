/**
 * Chrome 书签 API 适配层
 * 只负责与扩展环境交互，不持有状态；非扩展环境下全部安全降级。
 */

export const hasChromeBookmarks = () =>
  typeof window !== 'undefined' && Boolean(window.chrome?.bookmarks)

export const wrapChromeCallback = (runner) =>
  new Promise((resolve, reject) => {
    try {
      runner((result) => {
        const error = window.chrome?.runtime?.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }
        resolve(result)
      })
    } catch (error) {
      reject(error)
    }
  })

const pickBookmarkBarNode = (nodes) => {
  const found = nodes.find((node) => {
    if (String(node.id) === '1') return true
    const title = (node.title || '').toLowerCase()
    return ['书签栏', 'bookmarks bar', 'bookmark bar'].includes(title)
  })
  return found || nodes.find((node) => String(node.id) === '1') || null
}

/**
 * 读取书签树，返回书签栏层级的节点集合。
 */
export const fetchBookmarkTree = async () => {
  const tree = await wrapChromeCallback((resolve) => window.chrome.bookmarks.getTree(resolve))
  const root = Array.isArray(tree) ? tree[0] : null
  const candidates = root?.children?.length ? root.children : Array.isArray(tree) ? tree : []
  const barNode = pickBookmarkBarNode(candidates)

  return {
    rootFolderId: String(barNode?.id || '1'),
    nodes: barNode?.children || []
  }
}

/** 备份要整棵树：书签栏、其他书签、移动设备书签都在根节点下面。 */
export const fetchBookmarkRoots = async () => {
  const tree = await wrapChromeCallback((resolve) => window.chrome.bookmarks.getTree(resolve))
  const root = Array.isArray(tree) ? tree[0] : null
  if (!Array.isArray(root?.children)) {
    throw new Error('读取书签失败，备份没有导出。')
  }
  return root.children
}

export const getChromeNodeOps = () => {
  const api = window.chrome?.bookmarks
  return {
    update: (id, title) => wrapChromeCallback((resolve) => api.update(id, { title }, resolve)),
    create: (bookmark) => wrapChromeCallback((resolve) => api.create(bookmark, resolve)),
    remove: (id) => wrapChromeCallback((resolve) => api.remove(id, resolve)),
    removeTree: (id) => wrapChromeCallback((resolve) => api.removeTree(id, resolve)),
    move: (id, destination = {}) =>
      wrapChromeCallback((resolve) => api.move(id, destination, resolve))
  }
}

/**
 * 打开书签：优先走 chrome.tabs，退化为 window.open。
 * options.background 为真时后台打开（中键点击）。
 */
export const openBookmarkUrl = (url, options = {}) => {
  if (!url || typeof window === 'undefined') {
    return
  }

  const shouldOpenInBackground = Boolean(options?.background)

  if (window.chrome?.tabs?.create) {
    window.chrome.tabs.create({ url, active: !shouldOpenInBackground }, () => {
      const error = window.chrome?.runtime?.lastError
      if (error) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
