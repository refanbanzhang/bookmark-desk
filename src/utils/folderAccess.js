export const FOLDER_ACCESS_KEY = 'bookmark-folder-access'

const readRecords = () => {
  const raw = localStorage.getItem(FOLDER_ACCESS_KEY)
  if (!raw) {
    return {}
  }

  try {
    const records = JSON.parse(raw)
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
      throw new Error('目录密码数据格式无效。')
    }
    return records
  } catch (error) {
    throw new Error(`读取目录密码失败：${error instanceof Error ? error.message : '数据格式无效。'}`)
  }
}

const writeRecords = (records) => {
  localStorage.setItem(FOLDER_ACCESS_KEY, JSON.stringify(records))
}

/** 备份只拷走盐和哈希，调用方拿不到 localStorage 里的原对象。 */
export const readFolderAccessRecords = () => {
  const records = readRecords()
  const copy = {}
  for (const [id, record] of Object.entries(records)) {
    copy[String(id)] = record
  }
  return copy
}

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

export const hashFolderPassword = async (password, salt) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持安全密码存储。')
  }

  const input = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input)
  return toHex(new Uint8Array(digest))
}

export const createFolderPassword = async (password) => {
  if (!password) {
    throw new Error('密码不能为空。')
  }

  const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await hashFolderPassword(password, salt) }
}

export const hasFolderPassword = (folderId) => Boolean(readRecords()[String(folderId)])

export const saveFolderPassword = async (folderId, password) => {
  const record = await createFolderPassword(password)
  const records = readRecords()
  records[String(folderId)] = record
  writeRecords(records)
}

export const verifyFolderPassword = async (folderId, password) => {
  const record = readRecords()[String(folderId)]
  if (!record) {
    throw new Error('该目录没有设置访问密码。')
  }
  return (await hashFolderPassword(password, record.salt)) === record.hash
}

export const removeFolderPassword = (folderId) => {
  const records = readRecords()
  delete records[String(folderId)]
  writeRecords(records)
}
