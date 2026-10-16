/**
 * 拖拽跟随预览：自绘一份跟着光标走的卡片。
 *
 * Chrome 的原生拖拽影像是 dragstart 那一刻的静态截图，拖拽途中改不了尺寸，
 * 所以这里在 dragstart 时用 1px 透明图把原生影像顶掉，再画一份自己的；
 * 悬停到目录（目录行 / 目录卡 / 目录 Tab）上方时把预览收成半格，
 * 让光标下面的目录露出来，用户能看清往哪个目录里拖；
 * 松手真的落进目录时，再把预览飞进那格、缩到它的宽度淡出，让这次移动有始有终。
 *
 * 两层结构是必须的：外层只跟光标（不能有过渡，否则位移被插值，预览永远追着光标走），
 * 内层只做收缩，带过渡。两层合一的话每帧都在过渡位移，手感会发飘。
 */

const PREVIEW_CLASS = 'drag-preview'
const CARD_CLASS = 'drag-preview__card'
const COMPACT_CLASS = 'drag-preview--compact'
/** 顶层格子里的卡片 / 目录卡内部的行，靠这个类在预览里补上各自那套尺寸 */
const CELL_CLASS = 'drag-preview--cell'
const ROW_CLASS = 'drag-preview--row'
/** SortableJS 在拖拽期间加在源元素上的类，别跟着抄进预览 */
const SOURCE_STATE_CLASSES = ['row--ghost', 'row--chosen', 'row--drag']
const FOLDER_ZONE_SELECTOR = '[data-folder-drop-id], .bookmark-item.is-folder, .tabbar'
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** 收缩档：缩到半格，并让开光标右下，光标处只留一张「手里拿着的小卡」 */
const COMPACT_SCALE = 0.5
const COMPACT_OFFSET = 12

/** 落进目录的收尾：预览飞进目标格再淡出，目标目录同时闪一下（时长与 .drop-settle 同档） */
const SETTLE_FLASH_CLASS = 'drop-settle'
const SETTLE_MS = 190
/** 快出缓收：先窜过去再稳稳收住，比全站那根对称缓动利落（曲线同 --ease-out-expo） */
const SETTLE_EASE = 'var(--ease-out-expo)'
/** 透明度只演最后一段，前面保持清晰，别一路糊着飞 */
const SETTLE_FADE_DELAY_MS = Math.round(SETTLE_MS * 0.4)
const SETTLE_FADE_MS = SETTLE_MS - SETTLE_FADE_DELAY_MS
const SETTLE_MIN_SCALE = 0.18

/** 顶层目录卡片的类名，同 useBookmarkDrag.isRootFolderCardElement */
const ROOT_CARD_CLASS = 'is-root-folder'

let positionEl = null
let cardEl = null
let blankImageEl = null
let grabOffsetX = 0
let grabOffsetY = 0
let pointerX = 0
let pointerY = 0
let compact = false
let listening = false
/** 源元素在 dragstart 那一刻的处境：原属哪个目录、是不是整张卡、多大、它是谁 */
let sourceNodeEl = null
let sourceParentId = ''
let sourceIsCard = false
let sourceWidth = 0
let sourceHeight = 0
let settling = false
let settleTimer = 0
/** 刚刚闪过的目录：动画没走到头也要把类摘回来 */
let flashZone = null

const isOverFolderZone = (element) => Boolean(element?.closest?.(FOLDER_ZONE_SELECTOR))

/** 顶层格子的卡片拿得到 .group.depth-0 的规矩，格子外面的行拿的是卡内紧凑行那套 */
const getContextClass = (sourceEl) =>
  sourceEl.parentElement?.classList?.contains('depth-0') ? CELL_CLASS : ROW_CLASS

/** 外层：光标在哪，预览就在哪，每帧即时写，不带过渡 */
const renderPosition = () => {
  if (!positionEl) {
    return
  }
  positionEl.style.transform = `translate3d(${Math.round(pointerX)}px, ${Math.round(pointerY)}px, 0)`
}

/** 内层：抓握点对齐光标（悬停目录时让开光标右下并缩半格），这一层才做过渡 */
const renderCard = () => {
  if (!cardEl) {
    return
  }
  cardEl.style.transform = compact
    ? `translate3d(${COMPACT_OFFSET}px, ${COMPACT_OFFSET}px, 0) scale(${COMPACT_SCALE})`
    : `translate3d(${-grabOffsetX}px, ${-grabOffsetY}px, 0) scale(1)`
}

/** 目录卡 / 目录行真正有底色和边框的那层，闪一下得看得见 */
const getFolderSurface = (element) => {
  if (!element) {
    return null
  }
  if (element.classList.contains('module__head')) {
    return element.closest('.module')
  }
  if (element.classList.contains('bookmark-item')) {
    return element.querySelector(':scope > .module, :scope > .row')
  }
  return element
}

/**
 * 松手瞬间的落点目录：只认真的换了个目录，同层重排不参与动画。
 * 判据和 useBookmarkDrag 一致——目录行整行、目录卡标题栏、Tab 各自声明自己是谁，
 * 都没压着目录就看指针落在哪个列表里（列表的 data-group-parent-id 就是它的目录）。
 */
const resolveDropFolder = (target) => {
  if (!target?.closest) {
    return null
  }

  /* 落点在源元素自己肚子里（自己、自己的子目录）：原地打转，本来也动不了 */
  if (sourceNodeEl?.contains?.(target)) {
    return null
  }

  const tab = target.closest('.tab[data-folder-tab-id]')
  if (tab) {
    const tabId = String(tab.dataset.folderTabId || '')
    return !tabId || tabId === sourceParentId ? null : tab
  }

  const zone = target.closest('[data-folder-drop-id]')
  /* 拖整张目录卡时，别人卡片的标题栏留给换位排序，不算移入 */
  if (sourceIsCard && zone?.classList?.contains('module__head')) {
    return null
  }

  const list = target.closest('ul.group')
  const folderId = zone
    ? String(zone.dataset.folderDropId || '')
    : String(list?.dataset?.groupParentId || '')
  if (!folderId || folderId === sourceParentId) {
    return null
  }

  return getFolderSurface(zone || list?.closest('.bookmark-item.is-folder'))
}

/** 预览飞进目标目录的格子、缩到它的宽度再淡出；目标目录自己闪一下，落点就交代清楚了 */
const settleIntoFolder = (zone) => {
  const rect = zone.getBoundingClientRect()
  if (!cardEl || !sourceWidth || !sourceHeight || !rect.width || !rect.height) {
    return false
  }

  const scale = Math.max(SETTLE_MIN_SCALE, Math.min(1, rect.width / sourceWidth))
  const x = Math.round(rect.left + rect.width / 2 - pointerX - (sourceWidth * scale) / 2)
  const y = Math.round(rect.top + rect.height / 2 - pointerY - (sourceHeight * scale) / 2)

  cardEl.classList.remove(COMPACT_CLASS)
  cardEl.style.transition = `transform ${SETTLE_MS}ms ${SETTLE_EASE}, opacity ${SETTLE_FADE_MS}ms var(--ease) ${SETTLE_FADE_DELAY_MS}ms`
  cardEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  cardEl.style.opacity = '0'

  /* 类不摘掉的话，同一个目录第二次落进去动画不会重播 */
  zone.classList.add(SETTLE_FLASH_CLASS)
  zone.addEventListener('animationend', () => zone.classList.remove(SETTLE_FLASH_CLASS), { once: true })
  flashZone = zone
  return true
}

const handleDocumentDragOver = (event) => {
  if (!positionEl || settling) {
    return
  }
  const x = Number(event.clientX)
  const y = Number(event.clientY)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    pointerX = x
    pointerY = y
  }
  compact = isOverFolderZone(event.target)
  cardEl.classList.toggle(COMPACT_CLASS, compact)
  renderPosition()
  renderCard()
}

/** 落在目录上就让它演完收尾动画，别的落点直接收工 */
const handleDocumentDrop = (event) => {
  if (!positionEl || settling) {
    return
  }
  const zone = resolveDropFolder(event.target)
  if (!zone || !settleIntoFolder(zone)) {
    destroyDragPreview()
    return
  }
  settling = true
  settleTimer = setTimeout(destroyDragPreview, SETTLE_MS)
}

const handleDocumentDragEnd = () => {
  if (settling) {
    return
  }
  destroyDragPreview()
}

const destroyDragPreview = () => {
  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = 0
  }
  flashZone?.classList.remove(SETTLE_FLASH_CLASS)
  flashZone = null
  if (listening) {
    listening = false
    document.removeEventListener('dragover', handleDocumentDragOver, true)
    document.removeEventListener('dragend', handleDocumentDragEnd, true)
    document.removeEventListener('drop', handleDocumentDrop, true)
  }
  positionEl?.remove()
  blankImageEl?.remove()
  positionEl = null
  cardEl = null
  blankImageEl = null
  compact = false
  settling = false
  grabOffsetX = 0
  grabOffsetY = 0
  sourceNodeEl = null
  sourceParentId = ''
  sourceIsCard = false
  sourceWidth = 0
  sourceHeight = 0
}

const mountListeners = () => {
  if (listening) {
    return
  }
  listening = true
  document.addEventListener('dragover', handleDocumentDragOver, true)
  document.addEventListener('dragend', handleDocumentDragEnd, true)
  document.addEventListener('drop', handleDocumentDrop, true)
}

/** 源元素里可滚动的目录卡正文，预览也要停在同一位置，别跳回顶部 */
const copyScrollPositions = (source, target) => {
  target.scrollTop = source.scrollTop
  target.scrollLeft = source.scrollLeft
  const sourceChildren = source.children || []
  const targetChildren = target.children || []
  const count = Math.min(sourceChildren.length, targetChildren.length)
  for (let index = 0; index < count; index += 1) {
    copyScrollPositions(sourceChildren[index], targetChildren[index])
  }
}

/** 顶掉浏览器默认拖拽影像；失败时返回 false，此时不应再画自己的预览（会重影） */
const hideNativeDragImage = (dataTransfer) => {
  if (!dataTransfer?.setDragImage) {
    return false
  }
  const image = document.createElement('img')
  image.src = TRANSPARENT_PIXEL
  image.alt = ''
  image.setAttribute('aria-hidden', 'true')
  image.style.cssText = 'position:fixed;top:-10px;left:-10px;width:1px;height:1px;'
  document.body.appendChild(image)
  try {
    dataTransfer.setDragImage(image, 0, 0)
  } catch (error) {
    image.remove()
    console.error('drag preview: setDragImage failed', error)
    return false
  }
  blankImageEl = image
  return true
}

/** 必须在原生 dragstart 的同步流程里调用，晚一刻 setDragImage 就不生效了 */
export const startDragPreview = (sourceEl, event) => {
  destroyDragPreview()
  if (!sourceEl || typeof document === 'undefined') {
    return
  }

  const x = Number(event?.clientX)
  const y = Number(event?.clientY)
  const rect = sourceEl.getBoundingClientRect()
  if (!Number.isFinite(x) || !Number.isFinite(y) || !rect.width || !rect.height) {
    return
  }
  if (!hideNativeDragImage(event?.dataTransfer)) {
    return
  }

  const clone = sourceEl.cloneNode(true)
  clone.removeAttribute('draggable')
  clone.removeAttribute('id')
  SOURCE_STATE_CLASSES.forEach((name) => clone.classList.remove(name))
  clone.classList.add(getContextClass(sourceEl))
  clone.style.width = `${Math.round(rect.width)}px`
  clone.style.height = `${Math.round(rect.height)}px`
  copyScrollPositions(sourceEl, clone)

  const card = document.createElement('div')
  card.className = CARD_CLASS
  card.appendChild(clone)

  const position = document.createElement('div')
  position.className = PREVIEW_CLASS
  position.style.width = `${Math.round(rect.width)}px`
  position.style.height = `${Math.round(rect.height)}px`
  position.appendChild(card)
  document.body.appendChild(position)

  positionEl = position
  cardEl = card
  grabOffsetX = Math.round(x - rect.left)
  grabOffsetY = Math.round(y - rect.top)
  pointerX = x
  pointerY = y
  compact = false
  settling = false
  sourceNodeEl = sourceEl
  sourceParentId = String(sourceEl.parentElement?.dataset?.groupParentId || '')
  sourceIsCard = sourceEl.classList.contains(ROOT_CARD_CLASS)
  sourceWidth = Math.round(rect.width)
  sourceHeight = Math.round(rect.height)
  mountListeners()
  renderPosition()
  renderCard()
}
