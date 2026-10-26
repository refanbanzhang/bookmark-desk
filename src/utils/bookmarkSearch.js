import { hasChildren } from './bookmarkTree.js'

const compact = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '')

const compactUrl = (url) =>
  compact(String(url || '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, ''))

const tokenize = (query) =>
  String(query || '')
    .trim()
    .split(/\s+/)
    .map(compact)
    .filter(Boolean)

const fuzzyScore = (text, token) => {
  let from = 0
  let gap = 0
  for (const ch of token) {
    const at = text.indexOf(ch, from)
    if (at < 0) {
      return 0
    }
    gap += at - from
    from = at + 1
  }
  if (gap > token.length) {
    return 0
  }
  return Math.max(1, 40 - gap)
}

const fieldScore = (text, token) => {
  if (!text || !token) {
    return 0
  }
  const at = text.indexOf(token)
  if (at === 0) {
    return 200
  }
  if (at > 0) {
    return 140 - Math.min(at, 40)
  }
  return fuzzyScore(text, token)
}

const scoreNode = (node, tokens) => {
  const title = compact(node?.title)
  const url = node?.url ? compactUrl(node.url) : ''
  let total = 0

  for (const token of tokens) {
    const titleScore = fieldScore(title, token)
    const urlScore = fieldScore(url, token)
    const best = Math.max(titleScore, urlScore)
    if (!best) {
      return 0
    }
    total += best + (titleScore > 0 && titleScore >= urlScore ? 20 : 0)
  }

  return total
}

/**
 * 在整棵书签树上按标题和地址做模糊匹配。
 * hiddenFolderIds 里的目录仍可按自己的标题命中，但其子节点不会进入结果。
 */
export const searchBookmarks = (nodes = [], query, hiddenFolderIds = new Set()) => {
  const tokens = tokenize(query)
  if (!tokens.length) {
    return []
  }

  const hits = []
  const walk = (list) => {
    for (const node of list || []) {
      const locked = hiddenFolderIds.has(String(node.id))
      const score = scoreNode(node, tokens)
      if (score > 0) {
        hits.push({ node, score })
      }
      if (hasChildren(node) && !locked) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      String(a.node.title || '').localeCompare(String(b.node.title || ''), 'zh')
  )
  return hits.map((hit) => hit.node)
}

/** 未解锁的加密目录。子树在搜索和最近访问里都不可见。 */
export const collectLockedFolderIds = (nodes = [], isLocked) => {
  const hidden = new Set()
  const walk = (list) => {
    for (const node of list || []) {
      if (!hasChildren(node)) {
        continue
      }
      if (isLocked(node)) {
        hidden.add(String(node.id))
        continue
      }
      walk(node.children)
    }
  }
  walk(nodes)
  return hidden
}
