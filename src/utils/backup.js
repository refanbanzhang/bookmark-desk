import { normalizeBackgroundSettings } from './backgroundSettings.js'
import { isSharedImageUrl } from './syncPrefs.js'

/** 一个文件两用：正文是 Netscape 书签，Chrome 书签管理器能直接导入；
    文件末尾的注释是本机设置。注释内容是 base64，书签标题里的 `--` 关不掉它。 */
export const BACKUP_FORMAT = 'bookmark-desk-backup'
export const BACKUP_VERSION = 1

const MARKER = `${BACKUP_FORMAT}:${BACKUP_VERSION}`
const MARKER_RE = new RegExp(`<!-- ${MARKER}\\n([A-Za-z0-9+/=]+)\\n-->\\s*$`)
const CHROME_TOOLBAR_ID = '1'

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const pad = (value) => String(value).padStart(2, '0')

export const formatBackupDay = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const encodeUtf8Base64 = (text) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

export const decodeUtf8Base64 = (value) => {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const isFolder = (node) => Array.isArray(node?.children) && !node?.url

const toPortable = (node, markToolbar) => {
  if (!node || typeof node !== 'object') {
    return null
  }

  const title = typeof node.title === 'string' ? node.title : ''
  if (isFolder(node)) {
    const folder = { title, children: [] }
    if (node.id != null && node.id !== '') {
      folder.id = String(node.id)
    }
    if (markToolbar && folder.id === CHROME_TOOLBAR_ID) {
      folder.toolbar = true
    }
    const added = Number(node.dateAdded)
    if (Number.isFinite(added) && added > 0) {
      folder.added = added
    }
    for (const child of node.children) {
      const next = toPortable(child, false)
      if (next) {
        folder.children.push(next)
      }
    }
    return folder
  }

  if (typeof node.url !== 'string' || !node.url) {
    return null
  }

  const bookmark = { title, url: node.url }
  if (node.id != null && node.id !== '') {
    bookmark.id = String(node.id)
  }
  const added = Number(node.dateAdded)
  if (Number.isFinite(added) && added > 0) {
    bookmark.added = added
  }
  return bookmark
}

/** 只留下导入和恢复需要的字段。Chrome 的 parentId、index 不属于备份。 */
export const portableBookmarks = (nodes, { markToolbar = false } = {}) => {
  if (!Array.isArray(nodes)) {
    throw new Error('书签数据格式无效，备份没有导出。')
  }

  const bookmarks = []
  for (const node of nodes) {
    const next = toPortable(node, markToolbar)
    if (next) {
      bookmarks.push(next)
    }
  }
  return bookmarks
}

const addedAttr = (node) => {
  if (!Number.isFinite(node.added)) {
    return ''
  }
  return ` ADD_DATE="${Math.round(node.added / 1000)}"`
}

const writeBookmarks = (lines, nodes, depth) => {
  const indent = '    '.repeat(depth)
  for (const node of nodes) {
    if (Array.isArray(node.children)) {
      const toolbar = node.toolbar ? ' PERSONAL_TOOLBAR_FOLDER="true"' : ''
      lines.push(`${indent}<DT><H3${addedAttr(node)}${toolbar}>${escapeHtml(node.title)}</H3>`)
      lines.push(`${indent}<DL><p>`)
      writeBookmarks(lines, node.children, depth + 1)
      lines.push(`${indent}</DL><p>`)
      continue
    }

    lines.push(
      `${indent}<DT><A HREF="${escapeHtml(node.url)}"${addedAttr(node)}>${escapeHtml(node.title || node.url)}</A>`
    )
  }
}

export const bookmarksToHtml = (nodes, title) => {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    `<TITLE>${escapeHtml(title)}</TITLE>`,
    `<H1>${escapeHtml(title)}</H1>`,
    '<DL><p>'
  ]
  writeBookmarks(lines, nodes, 1)
  lines.push('</DL><p>')
  return lines.join('\n')
}

const isDataMedia = (url) => /^data:image\//.test(url) || /^data:video\//.test(url)

/** 背景只收 http(s) 和 data URL。blob 地址出了这个页面就失效，写进文件等于丢掉。 */
export const sanitizeBackground = (settings) => {
  const normalized = normalizeBackgroundSettings(settings)
  const imageUrl = normalized.imageUrl
  if (typeof Blob !== 'undefined' && imageUrl instanceof Blob) {
    throw new Error('本地背景还没有读出来，备份没有导出。')
  }
  if (typeof imageUrl !== 'string') {
    throw new Error('背景地址无效，备份没有导出。')
  }
  if (imageUrl.startsWith('blob:')) {
    throw new Error('本地背景还没有读出来，备份没有导出。')
  }
  if (imageUrl && !isSharedImageUrl(imageUrl) && !isDataMedia(imageUrl)) {
    throw new Error('背景地址无法写入备份。请改用图片地址，或先清除背景后再导出。')
  }
  return { ...normalized, imageUrl }
}

export const sanitizeFolderAccess = (records) => {
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    throw new Error('目录密码数据格式无效，备份没有导出。')
  }

  const copy = {}
  for (const [id, record] of Object.entries(records)) {
    if (!record || typeof record.salt !== 'string' || typeof record.hash !== 'string' || !record.salt || !record.hash) {
      throw new Error('目录密码数据格式无效，备份没有导出。')
    }
    copy[String(id)] = { salt: record.salt, hash: record.hash }
  }
  return copy
}

const backupTitle = (source) => (source === 'demo' ? 'Bookmark Desk 演示数据' : 'Bookmark Desk')

export const createBackupFile = ({
  nodes,
  source,
  theme = '',
  activeTab = '',
  background,
  folderAccess,
  now = () => new Date()
}) => {
  if (source !== 'chrome' && source !== 'demo') {
    throw new Error('无法确定备份来源，备份没有导出。')
  }

  const stamp = now()
  const exportedAt = stamp.toISOString()
  const bookmarks = portableBookmarks(nodes, { markToolbar: source === 'chrome' })
  const document = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    source,
    bookmarks,
    settings: {
      theme: theme === 'dark' || theme === 'light' ? theme : '',
      activeTab: typeof activeTab === 'string' ? activeTab : '',
      background: sanitizeBackground(background),
      folderAccess: sanitizeFolderAccess(folderAccess)
    }
  }
  const html = [
    bookmarksToHtml(bookmarks, backupTitle(source)),
    `<!-- ${MARKER}`,
    encodeUtf8Base64(JSON.stringify(document)),
    '-->',
    ''
  ].join('\n')
  const day = formatBackupDay(stamp)
  const filename = source === 'demo' ? `bookmark-desk-demo-${day}.html` : `bookmark-desk-backup-${day}.html`

  return { filename, html, document }
}

export const parseBackupHtml = (html) => {
  if (typeof html !== 'string' || !html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')) {
    throw new Error('这不是书签备份文件。')
  }

  const match = html.match(MARKER_RE)
  if (!match) {
    throw new Error('备份文件缺少本机设置，无法识别。')
  }

  let parsed
  try {
    parsed = JSON.parse(decodeUtf8Base64(match[1]))
  } catch {
    throw new Error('备份文件已损坏，无法读取。')
  }

  if (!parsed || parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) {
    throw new Error('无法识别的备份版本。')
  }
  if (!Array.isArray(parsed.bookmarks) || !parsed.settings) {
    throw new Error('备份文件已损坏，无法读取。')
  }
  return parsed
}
