import { computed, ref } from 'vue'
import { readVisits, rememberVisit, resolveRecentVisits, writeVisits } from '../utils/recentVisits'
import { useBookmarkSearch } from './useBookmarkSearch'
import { useBookmarkTree } from './useBookmarkTree'

const visits = ref(readVisits())

export const useRecentVisits = () => {
  const { bookmarkTree } = useBookmarkTree()
  const { hiddenFolderIds } = useBookmarkSearch()

  const recentNodes = computed(() =>
    resolveRecentVisits(visits.value, bookmarkTree.value, hiddenFolderIds.value)
  )

  const recordVisit = (node) => {
    const next = rememberVisit(visits.value, node)
    if (next === visits.value) {
      return
    }
    visits.value = next
    writeVisits(next)
  }

  return {
    recentNodes,
    recordVisit
  }
}
