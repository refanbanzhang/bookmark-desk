<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
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
  },
  sortable: {
    type: Boolean,
    default: true
  },
  emptyTitle: {
    type: String,
    default: '暂无书签'
  },
  emptyHint: {
    type: String,
    default: '用右上角新建目录，或在 Chrome 书签管理器里添加内容。'
  }
})

const emit = defineEmits(['open-folder'])

const skeletonRows = [
  { title: '62%', host: '40%' },
  { title: '48%', host: '32%' },
  { title: '70%', host: '46%' },
  { title: '56%', host: '38%' }
]

const skeletonBoard = ref(null)

const logGridLayout = async () => {
  if (!import.meta.env.DEV || props.loading || !props.nodes.length) {
    return
  }

  await nextTick()
  const grid = document.querySelector('.board > .group.depth-0')
  if (!grid) {
    return
  }

  console.debug('[bookmark grid layout]', {
    alignItems: getComputedStyle(grid).alignItems,
    items: [...grid.children].map((item) => {
      const module = item.querySelector('.module')
      return {
        type: item.classList.contains('is-root-folder') ? 'folder' : 'bookmark',
        itemHeight: Math.round(item.getBoundingClientRect().height),
        moduleHeight: module ? Math.round(module.getBoundingClientRect().height) : null,
        minHeight: getComputedStyle(item).minHeight
      }
    })
  })
}

watch(() => props.nodes, logGridLayout, { flush: 'post' })
onMounted(logGridLayout)

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
    <BookmarkTree
      :nodes="nodes"
      :parent-id="parentId"
      :depth="0"
      :sortable="sortable"
      @open-folder="emit('open-folder', $event)"
    />
  </div>

  <div v-else class="empty">
    <b class="empty__title">{{ emptyTitle }}</b>
    {{ emptyHint }}
  </div>
</template>
