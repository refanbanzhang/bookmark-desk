import { computed, nextTick, ref, watch } from 'vue'
import { hasChildren, insertChildNode, pruneNodesByIds, renameNodeInTree } from '../utils/bookmarkTree'
import { getChromeNodeOps, hasChromeBookmarks } from './useChromeBookmarks'
import { useBookmarkTree } from './useBookmarkTree'

/**
 * 书签 / 目录的增删改交互与对应对话框状态。
 */
const editingNode = ref(null)
const editingTitle = ref('')
const editError = ref('')
const editInputRef = ref(null)
const deletingNode = ref(null)
const creating = ref(false)
const createParentId = ref(null)
const createParentTitle = ref('')
const createTitle = ref('')
const createError = ref('')
const createInputRef = ref(null)

const nextLocalId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const nodeKind = (node) => (node ? (hasChildren(node) ? 'folder' : 'bookmark') : '')

export const useBookmarkActions = () => {
  const { bookmarkTree, warning, chromeRootFolderId } = useBookmarkTree()

  const editingKind = computed(() => nodeKind(editingNode.value))
  const deletingKind = computed(() => nodeKind(deletingNode.value))

  const closeEdit = () => {
    editingNode.value = null
    editingTitle.value = ''
    editError.value = ''
  }

  const closeDeleteConfirm = () => {
    deletingNode.value = null
  }

  const deleteNode = async (node) => {
    if (!node?.id) {
      return false
    }

    const targetId = String(node.id)

    try {
      if (hasChromeBookmarks()) {
        const ops = getChromeNodeOps()
        if (hasChildren(node)) {
          await ops.removeTree(targetId)
        } else {
          await ops.remove(targetId)
        }
      }

      bookmarkTree.value = pruneNodesByIds(bookmarkTree.value, [targetId])
      warning.value = hasChromeBookmarks() ? '' : 'warn.demoDelete'
      if (editingNode.value && String(editingNode.value.id) === targetId) {
        closeEdit()
      }
      return true
    } catch (error) {
      console.error('delete failed', error)
      warning.value = {
        key: 'warn.deleteFailed',
        params: { detail: error instanceof Error ? error.message : 'error.chromePermission' }
      }
      return false
    }
  }

  const openDeleteConfirm = (node) => {
    if (!node) return
    deletingNode.value = node
  }

  const confirmDelete = async () => {
    if (!deletingNode.value) {
      return
    }
    const success = await deleteNode(deletingNode.value)
    if (success) {
      closeDeleteConfirm()
    }
  }

  const closeCreate = () => {
    creating.value = false
    createParentId.value = null
    createParentTitle.value = ''
    createTitle.value = ''
    createError.value = ''
  }

  const openCreate = (parentId = null, parentTitle = '') => {
    creating.value = true
    createParentId.value = parentId ?? null
    createParentTitle.value = parentTitle || ''
    createTitle.value = ''
    createError.value = ''
  }

  const saveCreate = async () => {
    const name = createTitle.value.trim()
    if (!name) {
      createError.value = 'error.createEmpty'
      return null
    }

    const parentId = createParentId.value

    try {
      let createdId = nextLocalId()
      if (hasChromeBookmarks()) {
        const ops = getChromeNodeOps()
        const chromeParentId = parentId || chromeRootFolderId.value
        if (!chromeParentId) {
          throw new Error('找不到上级目录')
        }
        const created = await ops.create({ parentId: String(chromeParentId), title: name })
        if (!created?.id) {
          throw new Error('新建目录失败')
        }
        createdId = String(created.id)
      }

      const folder = { id: createdId, title: name, children: [] }
      bookmarkTree.value = insertChildNode(bookmarkTree.value, parentId, folder)
      warning.value = hasChromeBookmarks() ? '' : 'warn.demoCreate'
      closeCreate()
      return folder
    } catch (error) {
      console.error('create folder failed', error)
      createError.value = error instanceof Error ? error.message : 'error.createFailed'
      return null
    }
  }

  const openEdit = (node) => {
    editingNode.value = node
    editingTitle.value = node?.title || ''
    editError.value = ''
  }

  const saveEdit = async () => {
    if (!editingNode.value) {
      return
    }

    const nextTitle = editingTitle.value.trim()
    if (!nextTitle) {
      editError.value = 'error.createEmpty'
      return
    }

    const targetId = String(editingNode.value.id)

    try {
      if (hasChromeBookmarks()) {
        const ops = getChromeNodeOps()
        await ops.update(targetId, nextTitle)
      }

      bookmarkTree.value = renameNodeInTree(bookmarkTree.value, targetId, nextTitle)
      warning.value = hasChromeBookmarks() ? '' : 'warn.demoRename'
      closeEdit()
    } catch (error) {
      console.error('rename failed', error)
      editError.value = error instanceof Error ? error.message : 'error.renameFailed'
    }
  }

  watch(creating, async (open) => {
    if (!open) {
      return
    }
    await nextTick()
    createInputRef.value?.focus?.()
  })

  // 打开重命名对话框后自动聚焦并全选，保持原有交互
  watch(editingNode, async (node) => {
    if (!node) {
      return
    }

    await nextTick()
    editInputRef.value?.focus?.()
    editInputRef.value?.select?.()
  })

  return {
    editingNode,
    editingTitle,
    editingKind,
    editError,
    editInputRef,
    deletingNode,
    deletingKind,
    openEdit,
    closeEdit,
    saveEdit,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    deleteNode,
    creating,
    createParentId,
    createParentTitle,
    createTitle,
    createError,
    createInputRef,
    openCreate,
    closeCreate,
    saveCreate
  }
}
