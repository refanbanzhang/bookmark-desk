import { computed, ref } from 'vue'
import { hasChildren, findNodeById } from '../utils/bookmarkTree'
import { ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { useBookmarkTree } from './useBookmarkTree'

const MENU_WIDTH = 220
const MENU_HEIGHT = 228
const TAB_MENU_HEIGHT = 264
const BAR_MENU_HEIGHT = 48
const MENU_PADDING = 8

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const contextMenu = ref({ visible: false, x: 0, y: 0, node: null, scope: 'node' })

/**
 * 右键菜单：状态、视口内定位与关闭。
 */
export const useContextMenu = () => {
  const { bookmarkTree } = useBookmarkTree()

  const contextNode = computed(() => contextMenu.value.node)
  const contextScope = computed(() => contextMenu.value.scope)
  const contextKind = computed(() =>
    contextNode.value ? (hasChildren(contextNode.value) ? 'folder' : 'bookmark') : ''
  )
  const contextMenuStyle = computed(() => ({
    left: `${contextMenu.value.x}px`,
    top: `${contextMenu.value.y}px`
  }))

  const closeContextMenu = () => {
    if (!contextMenu.value.visible) {
      return
    }
    contextMenu.value = { visible: false, x: 0, y: 0, node: null, scope: 'node' }
  }

  const placeMenu = (point, height) => ({
    x: clamp(point.x, MENU_PADDING, window.innerWidth - MENU_WIDTH - MENU_PADDING),
    y: clamp(point.y, MENU_PADDING, window.innerHeight - height - MENU_PADDING)
  })

  const openContextMenu = (node, point) => {
    if (!node || !point) {
      return
    }

    contextMenu.value = {
      visible: true,
      ...placeMenu(point, MENU_HEIGHT),
      node,
      scope: 'node'
    }
  }

  const openBarContextMenu = (event) => {
    if (!event) {
      return
    }

    contextMenu.value = {
      visible: true,
      ...placeMenu({ x: event.clientX, y: event.clientY }, BAR_MENU_HEIGHT),
      node: null,
      scope: 'bar'
    }
  }

  const openTabContextMenu = (tabId, event) => {
    if (!tabId || tabId === ROOT_BOOKMARKS_TAB_ID || !event) {
      return
    }

    const node = findNodeById(bookmarkTree.value, tabId)
    if (!node) {
      return
    }

    contextMenu.value = {
      visible: true,
      ...placeMenu({ x: event.clientX, y: event.clientY }, TAB_MENU_HEIGHT),
      node,
      scope: 'tab'
    }
  }

  return {
    contextMenu,
    contextNode,
    contextScope,
    contextKind,
    contextMenuStyle,
    openContextMenu,
    openBarContextMenu,
    openTabContextMenu,
    closeContextMenu
  }
}
