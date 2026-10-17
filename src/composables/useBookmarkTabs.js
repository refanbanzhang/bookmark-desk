import { computed, ref, watch } from 'vue'
import { hasChildren } from '../utils/bookmarkTree'
import { ACTIVE_TAB_KEY, ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { useBookmarkTree } from './useBookmarkTree'

/**
 * 目录 Tab：由根目录派生，维护当前选中项与可见节点，并持久化选择。
 */
const activeTab = ref('')

export const useBookmarkTabs = () => {
  const { bookmarkTree } = useBookmarkTree()

  const tabOptions = computed(() => {
    const folders = bookmarkTree.value.filter((node) => hasChildren(node))
    if (folders.length) {
      return folders.map((folder) => ({
        id: String(folder.id),
        label: folder.title || '未命名目录',
        node: folder
      }))
    }

    if (bookmarkTree.value.length) {
      return [{ id: ROOT_BOOKMARKS_TAB_ID, label: '全部书签' }]
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
    const target = bookmarkTree.value.find((node) => String(node.id) === targetTabId)
    return target && hasChildren(target) ? String(target.id) : null
  })

  const visibleNodes = computed(() => {
    if (!tabOptions.value.length) {
      return bookmarkTree.value
    }
    const target = visibleParentId.value
      ? bookmarkTree.value.find((node) => String(node.id) === visibleParentId.value)
      : null
    if (!target || !hasChildren(target)) {
      return bookmarkTree.value
    }
    return target.children
  })

  const switchTab = (tabId) => {
    if (!tabId || tabId === activeTab.value) {
      return
    }
    activeTab.value = tabId
    localStorage.setItem(ACTIVE_TAB_KEY, tabId)
  }

  const initActiveTab = () => {
    activeTab.value = localStorage.getItem(ACTIVE_TAB_KEY) || ''
  }

  watch(tabOptions, (tabs) => {
    if (!tabs.length) {
      activeTab.value = ''
      localStorage.removeItem(ACTIVE_TAB_KEY)
      return
    }

    const exists = tabs.some((tab) => tab.id === activeTab.value)
    if (!exists) {
      const savedTabId = localStorage.getItem(ACTIVE_TAB_KEY) || ''
      activeTab.value = tabs.some((tab) => tab.id === savedTabId) ? savedTabId : tabs[0].id
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab.value)
    }
  })

  return {
    activeTab,
    tabOptions,
    visibleNodes,
    visibleParentId,
    switchTab,
    initActiveTab
  }
}
