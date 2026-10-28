<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { History } from 'lucide-vue-next'
import { t } from '../i18n'
import { getFaviconUrl } from '../utils/favicon'
import { openBookmarkUrl } from '../composables/useChromeBookmarks'
import { useContextMenu } from '../composables/useContextMenu'
import { useRecentVisits } from '../composables/useRecentVisits'
import BaseModal from './BaseModal.vue'

const { recentNodes, recordVisit } = useRecentVisits()
const { closeContextMenu, openContextMenu } = useContextMenu()
const failed = ref(new Set())
const open = ref(false)

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

const close = () => {
  open.value = false
}

const show = () => {
  closeContextMenu()
  open.value = true
}

const onKey = (event) => {
  if (!open.value || event.key !== 'Escape') {
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
  close()
}

onMounted(() => window.addEventListener('keydown', onKey, true))
onUnmounted(() => window.removeEventListener('keydown', onKey, true))

const openItem = (node, background = false) => {
  recordVisit(node)
  openBookmarkUrl(node.url, { background })
  if (!background) {
    close()
  }
}

const onAux = (node, event) => {
  if (event.button !== 1) {
    return
  }
  event.preventDefault()
  openItem(node, true)
}

const onMenu = (node, event) => {
  event.preventDefault()
  openContextMenu(node, { x: event.clientX, y: event.clientY })
}
</script>

<template>
  <button
    v-if="recentNodes.length"
    class="icon-btn tip"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :data-tip="t('recent.label')"
    :aria-label="t('recent.label')"
    @click="show"
  >
    <History :size="15" />
  </button>

  <Teleport to="body">
    <BaseModal v-if="open" :title="t('recent.label')" @close="close">
      <div class="recent__list">
        <button
          v-for="node in recentNodes"
          :key="node.id"
          class="recent__item"
          type="button"
          :title="node.title || node.url"
          @click="openItem(node)"
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
          <span class="recent__url">{{ node.url }}</span>
        </button>
      </div>
    </BaseModal>
  </Teleport>
</template>
