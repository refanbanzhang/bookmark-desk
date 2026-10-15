import { nextTick, ref } from 'vue'
import {
  hasChildren,
  findNodeById,
  getNodeLocation,
  getFolderOrderMovePosition,
  moveNodeToFinalIndexInTree
} from '../utils/bookmarkTree'
import { ROOT_BOOKMARKS_TAB_ID } from '../constants'
import { getChromeNodeOps, hasChromeBookmarks } from './useChromeBookmarks'
import { useBookmarkTree } from './useBookmarkTree'

const DRAGGING_FLAG = 'bookmarkDragging'

const dragSourceId = ref('')
const dragSourceIsCard = ref(false)
const activeDropFolderId = ref('')
const activeDropTabId = ref('')

/** 拖拽会话计数：多个递归列表可能同时挂起，用计数保证标记正确清除 */
const getGlobalDragCount = () => (typeof window === 'undefined' ? 0 : Number(window.__bookmarkDragCount || 0))

const setGlobalDragCount = (nextCount) => {
  if (typeof window === 'undefined') return
  const safeCount = Math.max(0, Number(nextCount) || 0)
  window.__bookmarkDragCount = safeCount
  if (safeCount > 0) {
    document.documentElement.dataset[DRAGGING_FLAG] = 'true'
    return
  }
  delete document.documentElement.dataset[DRAGGING_FLAG]
}

export const isBookmarkDragActive = () =>
  typeof document !== 'undefined' && document.documentElement.dataset[DRAGGING_FLAG] === 'true'

const normalizeParentId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return String(value)
}

const nodeContainsId = (node, targetId) => {
  if (!node) {
    return false
  }
  if (String(node.id) === String(targetId)) {
    return true
  }
  if (!hasChildren(node)) {
    return false
  }
  return node.children.some((child) => nodeContainsId(child, targetId))
}

const getClientPoint = (event) => {
  const source = event?.touches?.[0] || event?.changedTouches?.[0] || event
  const clientX = Number(source?.clientX)
  const clientY = Number(source?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null
  }

  return { clientX, clientY }
}

const logDrag = (message, details = {}) => {
  if (import.meta.env.DEV) {
    console.debug(`[bookmark drag] ${message}`, details)
  }
}

/** 顶层目录卡片：整张卡片可拖动换位，元素由 SortableJS 提供 */
export const isRootFolderCardElement = (element) =>
  Boolean(element?.classList?.contains('is-root-folder'))

/** 目录卡片的「移入」热区：拖顶层目录卡时忽略它，让位给换位排序 */
export const isCardHeadTarget = (element) => Boolean(element?.classList?.contains('module__head'))

export const useBookmarkDrag = () => {
  const { bookmarkTree, warning, chromeRootFolderId, loadBookmarks } = useBookmarkTree()

  const canMoveNode = (draggedId, targetParentId) => {
    const sourceNode = findNodeById(bookmarkTree.value, draggedId)
    const sourceLocation = getNodeLocation(bookmarkTree.value, draggedId)
    if (!sourceNode || !sourceLocation) {
      return false
    }
    if (!targetParentId) {
      return sourceLocation.parentId === null
    }
    if (String(sourceNode.id) === String(targetParentId)) {
      return false
    }
    return !nodeContainsId(sourceNode, targetParentId)
  }

  const clearDragDropTargets = () => {
    activeDropFolderId.value = ''
    activeDropTabId.value = ''
  }

  const resetDragSource = () => {
    dragSourceId.value = ''
    dragSourceIsCard.value = false
  }

  const setActiveDropFolder = (folderId) => {
    activeDropFolderId.value = folderId ? String(folderId) : ''
    if (activeDropFolderId.value) {
      activeDropTabId.value = ''
    }
  }

  const setActiveDropTab = (tabId) => {
    activeDropTabId.value = tabId ? String(tabId) : ''
    if (activeDropTabId.value) {
      activeDropFolderId.value = ''
    }
  }

  const getChromeMoveParentId = (parentId, fallbackRootId = '') => {
    if (parentId !== null && parentId !== undefined && parentId !== '') {
      return String(parentId)
    }
    return fallbackRootId || undefined
  }

  /**
   * Chrome 的插入索引：同目录内向下拖动时，移除自身会让目标位前移一格。
   */
  const getChromeMoveIndex = (event) => {
    const oldIndex = Number.isInteger(event.oldDraggableIndex) ? event.oldDraggableIndex : event.oldIndex
    const newIndex = Number.isInteger(event.newDraggableIndex) ? event.newDraggableIndex : event.newIndex
    const sourceParentId = normalizeParentId(event.from?.dataset.groupParentId || null)
    const targetParentId = normalizeParentId(event.to?.dataset.groupParentId || null)

    if (!Number.isInteger(newIndex) || newIndex < 0) {
      return null
    }

    if (
      Number.isInteger(oldIndex) &&
      oldIndex >= 0 &&
      sourceParentId === targetParentId &&
      oldIndex < newIndex
    ) {
      return newIndex + 1
    }

    return newIndex
  }

  const resolveExternalDropFolderId = (event, draggedIsCard) => {
    if (activeDropTabId.value) {
      return activeDropTabId.value
    }

    if (activeDropFolderId.value) {
      return activeDropFolderId.value
    }

    const point = getClientPoint(event?.originalEvent)
    if (!point || typeof document === 'undefined') {
      return null
    }

    const element = document.elementFromPoint(point.clientX, point.clientY)
    const tabButton = element?.closest?.('[data-folder-tab-id]')
    const tabFolderId = String(tabButton?.dataset.folderTabId || '')
    if (tabFolderId && tabFolderId !== ROOT_BOOKMARKS_TAB_ID) {
      return tabFolderId
    }

    const folderItem = element?.closest?.('.bookmark-item.is-folder')
    const folderTarget = element?.closest?.('[data-folder-drop-id]')
    if (draggedIsCard && isCardHeadTarget(folderTarget)) {
      return null
    }
    const folderId = String(folderTarget?.dataset.folderDropId || '')
    if (!folderId || !folderItem) {
      return null
    }

    return folderId
  }

  const getFolderAppendIndex = (folderId) => {
    const folder = findNodeById(bookmarkTree.value, folderId)
    return Array.isArray(folder?.children) ? folder.children.length : 0
  }

  /**
   * 先本地乐观更新，再同步到 Chrome；失败时重新拉取，保证界面与书签一致。
   */
  const applyNodeMove = async ({
    targetId,
    targetParentId,
    targetIndex,
    chromeIndex,
    demoWarning
  }) => {
    try {
      bookmarkTree.value = moveNodeToFinalIndexInTree(bookmarkTree.value, targetId, targetParentId, targetIndex)
      await nextTick()

      try {
        if (hasChromeBookmarks()) {
          const ops = getChromeNodeOps()
          const nextChromeIndex = Number.isInteger(chromeIndex) ? chromeIndex : targetIndex
          if (!Number.isInteger(nextChromeIndex) || nextChromeIndex < 0) {
            return
          }
          await ops.move(targetId, {
            parentId: getChromeMoveParentId(targetParentId, chromeRootFolderId.value),
            index: nextChromeIndex
          })
          await loadBookmarks()
        }

        warning.value = hasChromeBookmarks() ? '' : demoWarning
      } catch (error) {
        console.error('drag sync failed', error)
        await loadBookmarks()
        warning.value = `拖拽同步失败：${error instanceof Error ? error.message : '请检查 Chrome 书签权限。'}`
      }
    } finally {
      clearDragDropTargets()
    }
  }

  /** 顶层目录（Tab）换位：目录之间只有先后，没有父子关系 */
  const moveRootFolderOrder = async ({ targetId, beforeId }) => {
    const position = getFolderOrderMovePosition(bookmarkTree.value, targetId, beforeId)
    if (!position) {
      return
    }

    await applyNodeMove({
      targetId,
      targetParentId: null,
      targetIndex: position.targetIndex,
      chromeIndex: position.chromeIndex,
      demoWarning: '当前为演示数据，目录顺序仅在页面内生效。'
    })
  }

  const handleBookmarkDragStart = (nodeId, draggedIsCard = false) => {
    dragSourceId.value = nodeId ? String(nodeId) : ''
    dragSourceIsCard.value = Boolean(draggedIsCard)
    clearDragDropTargets()
    logDrag('start', { nodeId: dragSourceId.value, draggedIsCard: dragSourceIsCard.value })
  }

  /**
   * 目录卡片的标题栏声明自己为移入目标时带上 fromCardHead：
   * 若拖动的正是另一张卡片，则让位给换位排序，不再声明。
   */
  const handleFolderDragTargetChange = (folderId, options = {}) => {
    if (!isBookmarkDragActive()) {
      clearDragDropTargets()
      return
    }

    const claimsCardHead = options.fromCardHead && dragSourceIsCard.value
    const nextFolderId =
      !claimsCardHead && folderId && dragSourceId.value && canMoveNode(dragSourceId.value, folderId)
        ? String(folderId)
        : ''

    if (nextFolderId !== activeDropFolderId.value) {
      logDrag('folder-target', {
        sourceId: dragSourceId.value,
        targetId: nextFolderId || null
      })
    }
    setActiveDropFolder(nextFolderId)
  }

  const handleTabDragOver = (tabId, event) => {
    if (
      !isBookmarkDragActive() ||
      tabId === ROOT_BOOKMARKS_TAB_ID ||
      !dragSourceId.value ||
      !canMoveNode(dragSourceId.value, tabId)
    ) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    if (activeDropTabId.value !== String(tabId)) {
      logDrag('tab-target', {
        sourceId: dragSourceId.value,
        targetId: String(tabId)
      })
    }
    setActiveDropTab(tabId)
  }

  const handleTabDragLeave = (tabId, event) => {
    if (event.currentTarget?.contains?.(event.relatedTarget)) {
      return
    }
    if (activeDropTabId.value === String(tabId)) {
      activeDropTabId.value = ''
    }
  }

  const handleTabDrop = (tabId, event) => {
    if (
      !isBookmarkDragActive() ||
      tabId === ROOT_BOOKMARKS_TAB_ID ||
      !dragSourceId.value ||
      !canMoveNode(dragSourceId.value, tabId)
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setActiveDropTab(tabId)
  }

  const handleDragEnd = async (event) => {
    if (!event) {
      clearDragDropTargets()
      resetDragSource()
      return
    }

    const targetId = String(event.item?.dataset.nodeId || dragSourceId.value || '')
    if (!targetId) {
      clearDragDropTargets()
      resetDragSource()
      return
    }

    const sourceLocation = getNodeLocation(bookmarkTree.value, targetId)
    const draggedIsCard = dragSourceIsCard.value
    const externalTargetFolderId = resolveExternalDropFolderId(event, draggedIsCard)
    logDrag('end', {
      sourceId: targetId,
      targetId: externalTargetFolderId,
      sourceParentId: sourceLocation?.parentId ?? null
    })

    if (externalTargetFolderId && canMoveNode(targetId, externalTargetFolderId)) {
      const sourceParentId = normalizeParentId(sourceLocation?.parentId)
      if (sourceParentId !== normalizeParentId(externalTargetFolderId)) {
        const appendIndex = getFolderAppendIndex(externalTargetFolderId)

        await applyNodeMove({
          targetId,
          targetParentId: externalTargetFolderId,
          targetIndex: appendIndex,
          chromeIndex: appendIndex,
          demoWarning: '当前为演示数据，移动仅在页面内生效。'
        })
        resetDragSource()
        return
      }
    }

    if (event.from === event.to && event.oldIndex === event.newIndex) {
      clearDragDropTargets()
      resetDragSource()
      return
    }

    const targetParentId = normalizeParentId(event.to?.dataset.groupParentId || null)
    const nextIndex = Number.isInteger(event.newDraggableIndex) ? event.newDraggableIndex : event.newIndex
    if (!Number.isInteger(nextIndex) || nextIndex < 0) {
      clearDragDropTargets()
      resetDragSource()
      return
    }

    await applyNodeMove({
      targetId,
      targetParentId,
      targetIndex: nextIndex,
      chromeIndex: getChromeMoveIndex(event),
      demoWarning: ''
    })
    resetDragSource()
  }

  return {
    dragSourceId,
    dragSourceIsCard,
    activeDropFolderId,
    activeDropTabId,
    getGlobalDragCount,
    setGlobalDragCount,
    canMoveNode,
    clearDragDropTargets,
    handleBookmarkDragStart,
    handleFolderDragTargetChange,
    moveRootFolderOrder,
    handleTabDragOver,
    handleTabDragLeave,
    handleTabDrop,
    handleDragEnd
  }
}
