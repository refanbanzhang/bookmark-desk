import { computed, nextTick, ref, watch } from 'vue'
import { hasChildren, pruneNodesByIds, renameNodeInTree } from '../utils/bookmarkTree'
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

const nodeKind = (node) => (node ? (hasChildren(node) ? '文件夹' : '书签') : '')

export const useBookmarkActions = () => {
  const { bookmarkTree, warning } = useBookmarkTree()

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
      warning.value = hasChromeBookmarks() ? '' : '当前为演示数据，删除仅在页面内生效。'
      if (editingNode.value && String(editingNode.value.id) === targetId) {
        closeEdit()
      }
      return true
    } catch (error) {
      console.error('delete failed', error)
      warning.value = `删除失败：${error instanceof Error ? error.message : '请检查 Chrome 书签权限。'}`
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
      editError.value = '名称不能为空。'
      return
    }

    const targetId = String(editingNode.value.id)

    try {
      if (hasChromeBookmarks()) {
        const ops = getChromeNodeOps()
        await ops.update(targetId, nextTitle)
      }

      bookmarkTree.value = renameNodeInTree(bookmarkTree.value, targetId, nextTitle)
      warning.value = hasChromeBookmarks() ? '' : '当前为演示数据，重命名仅在页面内生效。'
      closeEdit()
    } catch (error) {
      console.error('rename failed', error)
      editError.value = error instanceof Error ? error.message : '重命名失败。'
    }
  }

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
    deleteNode
  }
}
