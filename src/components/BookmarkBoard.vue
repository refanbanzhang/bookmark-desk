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

const skeletonRows = [
  { title: '62%', host: '40%' },
  { title: '48%', host: '32%' },
  { title: '70%', host: '46%' }
]
</script>

<template>
  <div v-if="loading" class="board" aria-hidden="true">
    <div class="group depth-0">
      <section v-for="card in 3" :key="card" class="module module--skeleton">
        <div class="module__head">
          <span class="skeleton" style="width: 40%"></span>
        </div>
        <!-- 占位不画虚线分隔：它是骨架里最显眼的一笔，数据一到就闪没了；灰条本身几乎看不出 -->
        <div class="module__body">
          <div v-for="row in skeletonRows" :key="row.title" class="skeleton__row">
            <span class="skeleton skeleton--mark"></span>
            <span class="skeleton__stack">
              <span class="skeleton" :style="{ width: row.title }"></span>
              <span class="skeleton skeleton--thin" :style="{ width: row.host }"></span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-else-if="nodes.length" class="board">
    <BookmarkTree :nodes="nodes" :parent-id="parentId" :depth="0" />
  </div>

  <div v-else class="empty">
    <b class="empty__title">暂无书签</b>
    在 Chrome 书签管理器中添加内容后，重新打开新标签页即可。
  </div>
</template>
