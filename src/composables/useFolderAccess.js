import { computed, ref } from 'vue'
import {
  hasFolderPassword,
  removeFolderPassword,
  saveFolderPassword,
  verifyFolderPassword
} from '../utils/folderAccess'

const unlockedIds = ref(new Set())
const dialog = ref({ mode: '', node: null })
const error = ref('')
const pendingAction = ref(null)

const folderId = (node) => String(node?.id || '')

export const useFolderAccess = () => {
  const isProtected = (node) => Boolean(node && hasFolderPassword(folderId(node)))
  const isUnlocked = (node) => unlockedIds.value.has(folderId(node))

  const closeDialog = () => {
    dialog.value = { mode: '', node: null }
    error.value = ''
    pendingAction.value = null
  }

  const finishAccess = () => {
    const action = pendingAction.value
    pendingAction.value = null
    closeDialog()
    action?.()
  }

  const requestAccess = (node, action) => {
    if (!node || !isProtected(node) || isUnlocked(node)) {
      action?.()
      return true
    }
    pendingAction.value = action
    error.value = ''
    dialog.value = { mode: 'unlock', node }
    return false
  }

  const openSet = (node) => {
    if (!node) return
    error.value = ''
    dialog.value = { mode: isProtected(node) ? 'change' : 'set', node }
  }

  const openRemove = (node) => {
    if (!node || !isProtected(node)) return
    error.value = ''
    dialog.value = { mode: 'remove', node }
  }

  const submit = async ({ password, nextPassword }) => {
    const node = dialog.value.node
    const mode = dialog.value.mode
    if (!node) return

    try {
      if (mode === 'unlock') {
        if (!(await verifyFolderPassword(folderId(node), password))) {
          error.value = 'error.wrongPassword'
          return
        }
        unlockedIds.value = new Set(unlockedIds.value).add(folderId(node))
        finishAccess()
        return
      }

      if (mode === 'remove') {
        if (!(await verifyFolderPassword(folderId(node), password))) {
          error.value = 'error.wrongPassword'
          return
        }
        removeFolderPassword(folderId(node))
        unlockedIds.value = new Set(unlockedIds.value).add(folderId(node))
        finishAccess()
        return
      }

      if (mode === 'change' && !(await verifyFolderPassword(folderId(node), password))) {
        error.value = 'error.wrongCurrent'
        return
      }
      if (!nextPassword || nextPassword.length < 4) {
        error.value = 'error.passwordShort'
        return
      }
      await saveFolderPassword(folderId(node), nextPassword)
      unlockedIds.value = new Set(unlockedIds.value).add(folderId(node))
      finishAccess()
    } catch (submitError) {
      error.value = submitError instanceof Error ? submitError.message : 'error.passwordFailed'
    }
  }

  return {
    accessDialog: dialog,
    accessError: error,
    isProtected,
    isUnlocked,
    requestAccess,
    openSet,
    openRemove,
    closeDialog,
    submit,
    accessMode: computed(() => dialog.value.mode),
    accessNode: computed(() => dialog.value.node)
  }
}
