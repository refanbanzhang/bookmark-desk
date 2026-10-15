import { computed, ref } from 'vue'
import { hasChildren, findNodeById } from '../utils/bookmarkTree'
import { ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { useBookmarkTree } from './useBookmarkTree'

const MENU_WIDTH = 186
const MENU_HEIGHT = 112
const MENU_PADDING = 8

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const contextMenu = ref({ visible: false, x: 0, y: 0, node: null })

/**
 * 右键菜单：状态、视口内定位与关闭。
 */
export const useContextMenu = () => {
  const { bookmarkTree } = useBookmarkTree()

  const contextNode = computed(() => contextMenu.value.node)
  const contextKind = computed(() =>
    contextNode.value ? (hasChildren(contextNode.value) ? '文件夹' : '书签') : ''
  )
  const contextMenuStyle = computed(() => ({
    left: `${contextMenu.value.x}px`,
    top: `${contextMenu.value.y}px`
  }))

  const closeContextMenu = () => {
    if (!contextMenu.value.visible) {
      return
    }
    contextMenu.value = { visible: false, x: 0, y: 0, node: null }
  }

  const openContextMenu = (node, point) => {
    if (!node || !point) {
      return
    }

    const x = clamp(point.x, MENU_PADDING, window.innerWidth - MENU_WIDTH - MENU_PADDING)
    const y = clamp(point.y, MENU_PADDING, window.innerHeight - MENU_HEIGHT - MENU_PADDING)
    contextMenu.value = { visible: true, x, y, node }
  }

  const openTabContextMenu = (tabId, event) => {
    if (!tabId || tabId === ROOT_BOOKMARKS_TAB_ID) {
      return
    }

    const node = findNodeById(bookmarkTree.value, tabId)
    if (!node) {
      return
    }

    openContextMenu(node, { x: event.clientX, y: event.clientY })
  }

  return {
    contextMenu,
    contextNode,
    contextKind,
    contextMenuStyle,
    openContextMenu,
    openTabContextMenu,
    closeContextMenu
  }
}
