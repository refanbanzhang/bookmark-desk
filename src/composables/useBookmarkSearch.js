import { computed, ref } from 'vue'
import { collectLockedFolderIds, searchBookmarks } from '../utils/bookmarkSearch'
import { useBookmarkTree } from './useBookmarkTree'
import { useFolderAccess } from './useFolderAccess'

const query = ref('')

export const useBookmarkSearch = () => {
  const { bookmarkTree } = useBookmarkTree()
  const { isProtected, isUnlocked } = useFolderAccess()

  const hiddenFolderIds = computed(() =>
    collectLockedFolderIds(
      bookmarkTree.value,
      (node) => isProtected(node) && !isUnlocked(node)
    )
  )

  const isSearching = computed(() => query.value.trim().length > 0)

  const results = computed(() => {
    if (!isSearching.value) {
      return []
    }
    return searchBookmarks(bookmarkTree.value, query.value, hiddenFolderIds.value)
  })

  const clearQuery = () => {
    query.value = ''
  }

  return {
    query,
    isSearching,
    results,
    hiddenFolderIds,
    clearQuery
  }
}
