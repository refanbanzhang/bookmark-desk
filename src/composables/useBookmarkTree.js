import { ref } from 'vue'
import { fallbackTree } from '../mock/fallbackTreeClean'
import { hasChromeBookmarks, fetchBookmarkTree } from './useChromeBookmarks'

/**
 * 书签树数据层（模块级单例，供各视图与操作共享同一份状态）。
 */
const bookmarkTree = ref([])
const loading = ref(true)
const warning = ref('')
const chromeRootFolderId = ref('1')

const cloneFallback = () => JSON.parse(JSON.stringify(fallbackTree))

/** 每次成功读取后清掉上一轮的提示，正常状态不占界面 */
const syncStatusForMode = () => {
  warning.value = ''
}

const loadBookmarks = async () => {
  loading.value = true

  if (!hasChromeBookmarks()) {
    bookmarkTree.value = cloneFallback()
    chromeRootFolderId.value = ''
    syncStatusForMode()
    loading.value = false
    return
  }

  try {
    const { nodes, rootFolderId } = await fetchBookmarkTree()
    bookmarkTree.value = nodes
    chromeRootFolderId.value = rootFolderId
    syncStatusForMode()
  } catch (error) {
    console.error('bookmark fetch failed', error)
    warning.value = '读取书签失败，已显示演示内容。检查 Chrome 权限后重新打开新标签页即可。'
    bookmarkTree.value = cloneFallback()
    chromeRootFolderId.value = ''
  } finally {
    loading.value = false
  }
}

export const useBookmarkTree = () => ({
  bookmarkTree,
  loading,
  warning,
  chromeRootFolderId,
  syncStatusForMode,
  loadBookmarks,
  hasChromeBookmarks
})
