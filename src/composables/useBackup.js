import { ref } from 'vue'
import { ACTIVE_TAB_KEY } from '../constants'
import { createBackupFile } from '../utils/backup'
import { normalizeBackgroundSettings } from '../utils/backgroundSettings'
import { readFolderAccessRecords } from '../utils/folderAccess'
import { explicitTheme } from '../utils/syncPrefs'
import { useBackgroundImage } from './useBackgroundImage'
import { fetchBookmarkRoots, hasChromeBookmarks } from './useChromeBookmarks'
import { useBookmarkTree } from './useBookmarkTree'

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result) {
        resolve(reader.result)
        return
      }
      reject(new Error('读取本地背景失败，备份没有导出。'))
    }
    reader.onerror = () => reject(new Error('读取本地背景失败，备份没有导出。'))
    reader.readAsDataURL(blob)
  })

const materializeBackground = async (settings) => {
  const normalized = normalizeBackgroundSettings(settings)
  let imageUrl = normalized.imageUrl

  if (typeof Blob !== 'undefined' && imageUrl instanceof Blob) {
    imageUrl = await blobToDataUrl(imageUrl)
  } else if (typeof imageUrl === 'string' && imageUrl.startsWith('blob:')) {
    let response
    try {
      response = await fetch(imageUrl)
    } catch (error) {
      throw new Error('读取本地背景失败，备份没有导出。', { cause: error })
    }
    if (!response.ok) {
      throw new Error('读取本地背景失败，备份没有导出。')
    }
    imageUrl = await blobToDataUrl(await response.blob())
  }

  return { ...normalized, imageUrl }
}

const downloadTextFile = (filename, text) => {
  if (typeof document === 'undefined') {
    throw new Error('当前环境无法下载文件。')
  }

  const blob = new Blob([text], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const useBackup = () => {
  const exporting = ref(false)
  const { bookmarkTree, loading, warning } = useBookmarkTree()
  const { backgroundSettings } = useBackgroundImage()

  const exportBackup = async () => {
    if (exporting.value) {
      return
    }

    exporting.value = true
    try {
      const source = hasChromeBookmarks() ? 'chrome' : 'demo'
      let nodes
      if (source === 'chrome') {
        try {
          nodes = await fetchBookmarkRoots()
        } catch (error) {
          throw new Error('读取书签失败，备份没有导出。', { cause: error })
        }
      } else if (loading.value) {
        throw new Error('书签还在读取，请稍后再导出。')
      } else {
        nodes = bookmarkTree.value
      }

      let folderAccess
      try {
        folderAccess = readFolderAccessRecords()
      } catch (error) {
        throw new Error('目录密码数据已损坏，备份没有导出。', { cause: error })
      }

      const file = createBackupFile({
        nodes,
        source,
        theme: explicitTheme(),
        activeTab: localStorage.getItem(ACTIVE_TAB_KEY) || '',
        background: await materializeBackground(backgroundSettings.value),
        folderAccess
      })
      downloadTextFile(file.filename, file.html)
      if (source === 'demo') {
        warning.value = '当前是演示数据，导出的书签不是你的 Chrome 书签。'
      }
    } catch (error) {
      console.error('backup export failed', error)
      warning.value = error instanceof Error ? error.message : '导出备份失败。'
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportBackup }
}
