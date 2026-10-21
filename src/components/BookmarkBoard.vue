<script setup>
import { nextTick, ref, watch } from 'vue'
import BookmarkTree from './BookmarkTree.vue'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  parentId: {
    type: [String, Number],
    default: null
  }
})

const skeletonRows = [
  { title: '62%', host: '40%' },
  { title: '48%', host: '32%' },
  { title: '70%', host: '46%' },
  { title: '56%', host: '38%' }
]

const skeletonBoard = ref(null)

watch(
  () => props.loading,
  async (loading) => {
    if (!loading || !import.meta.env.DEV) {
      return
    }

    await nextTick()
    const cards = [...(skeletonBoard.value?.querySelector('.group.depth-0')?.children || [])]
    console.debug('[bookmark skeleton]', {
      cards: cards.length,
      sizes: cards.map((card) => {
        const rect = card.getBoundingClientRect()
        return { width: Math.round(rect.width), height: Math.round(rect.height) }
      })
    })
  }
)
</script>

<template>
  <div v-if="loading" ref="skeletonBoard" class="board" aria-hidden="true">
    <ul class="group depth-0 is-tile-grid">
      <li v-for="row in skeletonRows" :key="row.title" class="bookmark-item is-tile">
        <div class="row">
          <span class="skeleton skeleton--tile-mark"></span>
          <span class="skeleton__tile-stack">
            <span class="skeleton" :style="{ width: row.title }"></span>
            <span class="skeleton skeleton--thin" :style="{ width: row.host }"></span>
          </span>
        </div>
      </li>
    </ul>
  </div>

  <div v-else-if="nodes.length" class="board">
    <BookmarkTree :nodes="nodes" :parent-id="parentId" :depth="0" />
  </div>

  <div v-else class="empty">
    <b class="empty__title">暂无书签</b>
    在 Chrome 书签管理器中添加内容后，重新打开新标签页即可。
  </div>
</template>
