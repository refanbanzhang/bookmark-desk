<script setup>
import BookmarkTree from './BookmarkTree.vue'

defineProps({
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

const skeletonTiles = [
  { title: '62%', host: '44%' },
  { title: '48%', host: '36%' },
  { title: '70%', host: '50%' },
  { title: '54%', host: '30%' }
]
</script>

<template>
  <div v-if="loading" class="board" aria-hidden="true">
    <section v-for="module in 2" :key="module" class="module module--skeleton">
      <div class="module__head">
        <span class="skeleton" style="width: 40%"></span>
      </div>
      <div class="module__rule" aria-hidden="true"></div>
      <div class="module__body">
        <div v-for="tile in skeletonTiles" :key="tile.title" class="skeleton__tile">
          <span class="skeleton skeleton--mark"></span>
          <span class="skeleton" :style="{ width: tile.title }"></span>
          <span class="skeleton skeleton--thin" :style="{ width: tile.host }"></span>
        </div>
      </div>
    </section>
  </div>

  <div v-else-if="nodes.length" class="board">
    <BookmarkTree :nodes="nodes" :parent-id="parentId" :depth="0" />
  </div>

  <div v-else class="empty">
    <b class="empty__title">暂无书签</b>
    在 Chrome 书签管理器中添加内容后，重新打开新标签页即可。
  </div>
</template>
