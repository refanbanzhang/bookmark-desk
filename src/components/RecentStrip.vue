<script setup>
import { ref } from 'vue'
import { t } from '../i18n'
import { getFaviconUrl } from '../utils/favicon'
import { openBookmarkUrl } from '../composables/useChromeBookmarks'
import { useContextMenu } from '../composables/useContextMenu'
import { useRecentVisits } from '../composables/useRecentVisits'

defineProps({
  nodes: {
    type: Array,
    default: () => []
  }
})

const { recordVisit } = useRecentVisits()
const { openContextMenu } = useContextMenu()
const failed = ref(new Set())

const markOf = (node) => {
  const title = (node.title || '').trim()
  return title ? title.slice(0, 1).toUpperCase() : '·'
}

const showIcon = (node) => Boolean(getFaviconUrl(node.url)) && !failed.value.has(String(node.id))

const markFailed = (node) => {
  const next = new Set(failed.value)
  next.add(String(node.id))
  failed.value = next
}

const open = (node, background = false) => {
  recordVisit(node)
  openBookmarkUrl(node.url, { background })
}

const onAux = (node, event) => {
  if (event.button !== 1) {
    return
  }
  event.preventDefault()
  open(node, true)
}

const onMenu = (node, event) => {
  event.preventDefault()
  openContextMenu(node, { x: event.clientX, y: event.clientY })
}
</script>

<template>
  <section class="recent" :aria-label="t('recent.label')">
    <h2 class="recent__label">{{ t('recent.label') }}</h2>
    <div class="recent__list">
      <button
        v-for="node in nodes"
        :key="node.id"
        class="recent__item"
        type="button"
        :title="node.title || node.url"
        @click="open(node)"
        @auxclick="onAux(node, $event)"
        @contextmenu="onMenu(node, $event)"
      >
        <img
          v-if="showIcon(node)"
          class="recent__fav"
          :src="getFaviconUrl(node.url)"
          alt=""
          width="18"
          height="18"
          draggable="false"
          @error="markFailed(node)"
        />
        <span v-else class="recent__mark" aria-hidden="true">{{ markOf(node) }}</span>
        <span class="recent__title">{{ node.title || t('name.bookmark') }}</span>
      </button>
    </div>
  </section>
</template>
