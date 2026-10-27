import { computed, ref, watch } from 'vue'
import { findNodePath, hasChildren } from '../utils/bookmarkTree'
import { ACTIVE_TAB_KEY, ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { t } from '../i18n'
import { useBookmarkTree } from './useBookmarkTree'

/**
 * 目录 Tab：由根目录派生，维护当前选中项与可见节点，并持久化选择。
 */
const activeTab = ref('')
const drilldownIds = ref([])

export const useBookmarkTabs = () => {
  const { bookmarkTree } = useBookmarkTree()

  const tabOptions = computed(() => {
    const folders = bookmarkTree.value.filter((node) => hasChildren(node))
    if (folders.length) {
      return folders.map((folder) => ({
        id: String(folder.id),
        label: folder.title || t('name.folder'),
        node: folder
      }))
    }

    if (bookmarkTree.value.length) {
      return [{ id: ROOT_BOOKMARKS_TAB_ID, label: t('tab.all') }]
    }

    return []
  })

  const visibleParentId = computed(() => {
    if (!tabOptions.value.length) {
      return null
    }

    const targetTabId = activeTab.value || tabOptions.value[0].id
    if (targetTabId === ROOT_BOOKMARKS_TAB_ID) {
      return null
    }
    const target = currentFolder.value
    return target && hasChildren(target) ? String(target.id) : null
  })

  const rootFolder = computed(() => {
    const targetTabId = activeTab.value || tabOptions.value[0]?.id
    return bookmarkTree.value.find((node) => String(node.id) === targetTabId) || null
  })

  const currentFolder = computed(() => {
    let folder = rootFolder.value
    for (const id of drilldownIds.value) {
      folder = folder?.children?.find((node) => String(node.id) === String(id)) || null
      if (!folder) {
        break
      }
    }
    return folder
  })

  const visibleNodes = computed(() => {
    if (!tabOptions.value.length) {
      return bookmarkTree.value
    }
    if (!currentFolder.value || !hasChildren(currentFolder.value)) {
      return bookmarkTree.value
    }
    return currentFolder.value.children
  })

  const switchTab = (tabId) => {
    if (!tabId || tabId === activeTab.value) {
      return
    }
    activeTab.value = tabId
    drilldownIds.value = []
    localStorage.setItem(ACTIVE_TAB_KEY, tabId)
  }

  const openFolder = (folderId) => {
    if (!folderId || !visibleNodes.value.some((node) => String(node.id) === String(folderId))) {
      return false
    }
    drilldownIds.value = [...drilldownIds.value, String(folderId)]
    return true
  }

  /** 从搜索结果打开任意层级的目录：先切到所属 Tab，再沿路径下钻。返回是否进入了子级。 */
  const revealFolder = (folderId) => {
    const path = findNodePath(bookmarkTree.value, folderId)
    if (!path?.length) {
      return false
    }

    const [rootId, ...rest] = path
    const root = bookmarkTree.value.find((node) => String(node.id) === rootId)
    if (!root || !hasChildren(root)) {
      return false
    }

    activeTab.value = rootId
    drilldownIds.value = rest
    localStorage.setItem(ACTIVE_TAB_KEY, rootId)
    return rest.length > 0
  }

  const goBack = () => {
    if (!drilldownIds.value.length) {
      return false
    }
    drilldownIds.value = drilldownIds.value.slice(0, -1)
    return true
  }

  const isDrilledDown = computed(() => drilldownIds.value.length > 0)

  const initActiveTab = () => {
    activeTab.value = localStorage.getItem(ACTIVE_TAB_KEY) || ''
    drilldownIds.value = []
  }

  watch(tabOptions, (tabs) => {
    if (!tabs.length) {
      activeTab.value = ''
      drilldownIds.value = []
      localStorage.removeItem(ACTIVE_TAB_KEY)
      return
    }

    const exists = tabs.some((tab) => tab.id === activeTab.value)
    if (!exists) {
      const savedTabId = localStorage.getItem(ACTIVE_TAB_KEY) || ''
      activeTab.value = tabs.some((tab) => tab.id === savedTabId) ? savedTabId : tabs[0].id
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab.value)
    }

    const validIds = new Set()
    let folder = bookmarkTree.value.find((node) => String(node.id) === activeTab.value)
    for (const id of drilldownIds.value) {
      const child = folder?.children?.find((node) => String(node.id) === String(id))
      if (!child) {
        break
      }
      validIds.add(String(id))
      folder = child
    }
    if (validIds.size !== drilldownIds.value.length) {
      drilldownIds.value = drilldownIds.value.filter((id) => validIds.has(String(id)))
    }
  })

  return {
    activeTab,
    tabOptions,
    visibleNodes,
    visibleParentId,
    currentFolder,
    isDrilledDown,
    switchTab,
    openFolder,
    revealFolder,
    goBack,
    initActiveTab
  }
}
