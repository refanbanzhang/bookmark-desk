<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import {
  Bookmark,
  Moon,
  Palette,
  Pencil,
  Sun,
  Trash2,
  X
} from 'lucide-vue-next'
import BookmarkGroup from './components/BookmarkGroup.vue'
import { fallbackTree } from './mock/fallbackTreeClean'
import {
  findNodeById,
  getNodeLocation,
  hasChildren,
  moveNodeToFinalIndexInTree,
  pruneNodesByIds,
  renameNodeInTree
} from './utils/bookmarkTree'
import {
  clearBackgroundSettings,
  createDefaultBackgroundSettings,
  loadBackgroundSettings,
  normalizeBackgroundSettings,
  saveBackgroundSettings
} from './utils/backgroundSettings'

const bookmarkTree = ref([])
const loading = ref(true)
const status = ref('正在加载书签……')
const warning = ref('')
const activeTab = ref('')
const theme = ref('light')
const pageShellRef = ref(null)
const pageBackdropRef = ref(null)
const contentRef = ref(null)
const topbarRef = ref(null)
const tabsRef = ref(null)
const tabHighlightRef = ref(null)
const directoryViewRef = ref(null)
const modulesRef = ref(null)
const themeSwitchRef = ref(null)
const themeSwitchIconRef = ref(null)
const backgroundSettings = ref(createDefaultBackgroundSettings())
const backgroundDraft = ref(createDefaultBackgroundSettings())
const backgroundSettingsOpen = ref(false)
const animationEnabled = ref(true)
const bookmarkMotionEnabled = ref(false)
const backgroundError = ref('')
const backgroundFileInput = ref(null)
const chromeRootFolderId = ref('1')
const editingNode = ref(null)
const editingTitle = ref('')
const editError = ref('')
const editInput = ref(null)
const activeDropFolderId = ref('')
const activeDropTabId = ref('')
const dragSourceId = ref('')
const deletingNode = ref(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

const THEME_KEY = 'bookmark-theme'
const ACTIVE_TAB_KEY = 'bookmark-active-tab'
const ANIMATION_ENABLED_KEY = 'bookmark-animation-enabled'
const MAX_ANIMATED_BOOKMARKS = 24
const ROOT_BOOKMARKS_TAB_ID = '__root_bookmarks__'

let pageIntroTimeline = null
let bookmarksTimeline = null
let directorySwitchTimeline = null
let tabHighlightTimeline = null
let themeToggleTimeline = null
let motionMatcher = null
let systemAllowsMotion = true
let canAnimate = false
let bookmarkAnimationQueued = false
let isDragUpdating = false
let initialIntroQueued = false
let hasPlayedInitialIntro = false
let isTabSwitchAnimating = false
let pendingTabSwitchId = ''

const editingKind = computed(() => {
  if (!editingNode.value) return ''
  return hasChildren(editingNode.value) ? '文件夹' : '书签'
})

const deletingKind = computed(() => {
  if (!deletingNode.value) return ''
  return hasChildren(deletingNode.value) ? '文件夹' : '书签'
})

const contextNode = computed(() => contextMenu.value.node)
const contextKind = computed(() => (contextNode.value ? (hasChildren(contextNode.value) ? '文件夹' : '书签') : ''))
const contextMenuStyle = computed(() => ({
  left: `${contextMenu.value.x}px`,
  top: `${contextMenu.value.y}px`
}))
const previewBackgroundSettings = computed(() =>
  backgroundSettingsOpen.value
    ? normalizeBackgroundSettings(backgroundDraft.value)
    : backgroundSettings.value
)
const hasBackgroundImage = computed(
  () => previewBackgroundSettings.value.enabled && Boolean(previewBackgroundSettings.value.imageUrl)
)
const tabOptions = computed(() => {
  const folders = bookmarkTree.value.filter((node) => hasChildren(node))
  if (folders.length) {
    return folders.map((folder) => ({
      id: String(folder.id),
      label: folder.title || '未命名目录'
    }))
  }

  if (bookmarkTree.value.length) {
    return [
      {
        id: ROOT_BOOKMARKS_TAB_ID,
        label: '全部书签'
      }
    ]
  }

  return []
})

const visibleParentId = computed(() => {
  if (!tabOptions.value.length) {
    return null
  }

  const targetTabId = activeTab.value || tabOptions.value[0].id
  if (targetTabId === ROOT_BOOKMARKS_TAB_ID) {
    return null
  }
  const target = bookmarkTree.value.find((node) => String(node.id) === targetTabId)
  return target && hasChildren(target) ? String(target.id) : null
})
const visibleNodes = computed(() => {
  if (!tabOptions.value.length) {
    return bookmarkTree.value
  }
  const target = visibleParentId.value
    ? bookmarkTree.value.find((node) => String(node.id) === visibleParentId.value)
    : null
  if (!target || !hasChildren(target)) {
    return bookmarkTree.value
  }
  return target.children
})

const pageBackdropStyle = computed(() => {
  if (!hasBackgroundImage.value) {
    return {}
  }

  const blur = Number(previewBackgroundSettings.value.backdropBlur) || 0
  const scale = 1 + blur / 180

  return {
    backgroundImage: `url(${JSON.stringify(previewBackgroundSettings.value.imageUrl)})`,
    backgroundPosition: previewBackgroundSettings.value.position,
    backgroundRepeat: previewBackgroundSettings.value.repeat,
    backgroundSize: previewBackgroundSettings.value.size,
    opacity: previewBackgroundSettings.value.opacity,
    filter: blur > 0 ? `blur(${blur}px) saturate(1.05)` : 'none',
    transform: blur > 0 ? `scale(${scale})` : 'none'
  }
})

const pageShellStyle = computed(() => {
  const isDark = theme.value === 'dark'
  const cardOpacity = Number(previewBackgroundSettings.value.cardOpacity) || 0
  const cardRadius = Number(previewBackgroundSettings.value.cardRadius) || 0
  const tabRadius = Number(previewBackgroundSettings.value.tabRadius) || 0
  const tabItemRadius = Math.max(0, tabRadius - 2)
  const bookmarkCardRgb = isDark ? '28 28 30' : '255 255 255'
  const folderStartRgb = isDark ? '44 44 46' : '239 246 255'
  const folderEndRgb = isDark ? '28 28 30' : '255 255 255'
  const folderStartOpacity = Math.max(0, Math.min(1, cardOpacity - 0.05))
  const folderEndOpacity = Math.max(0, Math.min(1, cardOpacity - 0.02))

  return {
    '--bookmark-card-radius': `${cardRadius}px`,
    '--bookmark-card-bg': `rgb(${bookmarkCardRgb} / ${cardOpacity})`,
    '--folder-card-bg': `linear-gradient(180deg, rgb(${folderStartRgb} / ${folderStartOpacity}) 0%, rgb(${folderEndRgb} / ${folderEndOpacity}) 100%)`,
    '--bookmark-card-backdrop-filter': 'none',
    '--tab-shell-radius': `${tabRadius}px`,
    '--tab-item-radius': `${tabItemRadius}px`
  }
})

const hasChromeBookmarks = () => typeof window !== 'undefined' && Boolean(window.chrome?.bookmarks)

const wrapChromeCallback = (runner) =>
  new Promise((resolve, reject) => {
    try {
      runner((result) => {
        const error = window.chrome?.runtime?.lastError
        if (error) {
          reject(new Error(error.message))
          return
        }
        resolve(result)
      })
    } catch (error) {
      reject(error)
    }
  })

const loadBookmarksFromChrome = async () => {
  const tree = await wrapChromeCallback((resolve) => window.chrome.bookmarks.getTree(resolve))
  const root = Array.isArray(tree) ? tree[0] : null
  if (root?.children?.length) {
    const barNode = root.children.find((node) => {
      if (String(node.id) === '1') return true
      const title = (node.title || '').toLowerCase()
      return ['书签栏', 'bookmarks bar', 'bookmark bar'].includes(title)
    })
    return {
      rootFolderId: String(barNode?.id || '1'),
      nodes: barNode?.children || []
    }
  }

  if (Array.isArray(tree)) {
    const barNode = tree.find((node) => String(node.id) === '1')
    return {
      rootFolderId: String(barNode?.id || '1'),
      nodes: barNode?.children || []
    }
  }

  return {
    rootFolderId: '1',
    nodes: []
  }
}

const applyTheme = (value) => {
  theme.value = value === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme.value)
}

const initTheme = () => {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved)
    return
  }

  const preferDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  applyTheme(preferDark ? 'dark' : 'light')
}

const applyAnimationAvailability = () => {
  canAnimate = animationEnabled.value && systemAllowsMotion
  bookmarkMotionEnabled.value = canAnimate
}

const getThemeTransitionTargets = () => {
  return [hasBackgroundImage.value ? pageBackdropRef.value : null, contentRef.value].filter(Boolean)
}

const clearThemeTransitionState = () => {
  themeToggleTimeline?.kill()
  themeToggleTimeline = null
  clearAnimationTargets(getThemeTransitionTargets())
  clearAnimationTargets([themeSwitchRef.value, themeSwitchIconRef.value].filter(Boolean))
}

const animateThemeToggle = (nextTheme) => {
  if (!canAnimate) {
    applyTheme(nextTheme)
    return
  }

  const panelTargets = getThemeTransitionTargets()
  const switchButton = themeSwitchRef.value
  const switchIcon = themeSwitchIconRef.value

  clearThemeTransitionState()

  if (!panelTargets.length || !switchButton || !switchIcon) {
    applyTheme(nextTheme)
    return
  }

  themeToggleTimeline = gsap.timeline({
    defaults: {
      ease: 'power2.out'
    }
  })

  themeToggleTimeline
    .to(
      panelTargets,
      {
        autoAlpha: 0.88,
        y: 4,
        duration: 0.16,
        stagger: 0.01
      },
      0
    )
    .to(
      switchButton,
      {
        scale: 0.94,
        duration: 0.16
      },
      0
    )
    .to(
      switchIcon,
      {
        rotation: nextTheme === 'dark' ? 140 : -140,
        scale: 0.72,
        duration: 0.18
      },
      0
    )
    .add(() => {
      applyTheme(nextTheme)
      gsap.set(switchButton, {
        clearProps: 'backgroundColor,borderColor,color'
      })
      rememberHoverBase(switchButton)
      if (switchButton.matches(':hover')) {
        gsap.set(switchButton, {
          color: getRootCssVar('--theme-switch-fg-hover'),
          backgroundColor: getRootCssVar('--theme-switch-bg-hover'),
          borderColor: getRootCssVar('--theme-switch-border-hover')
        })
      }
    })
    .to(
      panelTargets,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.015,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility'
      }
    )
    .to(
      switchButton,
      {
        scale: 1,
        duration: 0.28,
        ease: 'back.out(1.7)',
        clearProps: 'transform'
      },
      '<'
    )
    .to(
      switchIcon,
      {
        rotation: 0,
        scale: 1,
        duration: 0.32,
        ease: 'back.out(1.8)',
        clearProps: 'transform'
      },
      '<'
    )
}

const toggleTheme = () => {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  animateThemeToggle(next)
  localStorage.setItem(THEME_KEY, next)
}

const initActiveTab = () => {
  activeTab.value = localStorage.getItem(ACTIVE_TAB_KEY) || ''
}

const initAnimationPreference = () => {
  animationEnabled.value = localStorage.getItem(ANIMATION_ENABLED_KEY) !== 'false'
}

const initMotionPreferences = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    systemAllowsMotion = true
    applyAnimationAvailability()
    motionMatcher = null
    return
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const updateMotionPreference = () => {
    systemAllowsMotion = !mediaQuery.matches
    applyAnimationAvailability()
  }

  updateMotionPreference()

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', updateMotionPreference)
    motionMatcher = {
      revert() {
        mediaQuery.removeEventListener('change', updateMotionPreference)
      }
    }
    return
  }

  motionMatcher = {
    revert() {
      mediaQuery.removeListener?.(updateMotionPreference)
    }
  }

  mediaQuery.addListener?.(updateMotionPreference)
}

const initBackgroundSettings = async () => {
  backgroundSettings.value = await loadBackgroundSettings()
}

const getRootCssVar = (name, element = document.documentElement) =>
  getComputedStyle(element).getPropertyValue(name).trim()

const logContrastState = (reason) => {
  if (!import.meta.env.DEV || !contentRef.value) {
    return
  }

  const rootStyles = getComputedStyle(document.documentElement)
  const contentStyles = getComputedStyle(contentRef.value)
  const tab = contentRef.value.querySelector('.tab-btn')
  const activeTab = contentRef.value.querySelector('.tab-btn-active')
  const tabStyles = tab ? getComputedStyle(tab) : null
  const activeTabStyles = activeTab ? getComputedStyle(activeTab) : null
  console.debug('[bookmark contrast]', {
    reason,
    theme: theme.value,
    backgroundImage: hasBackgroundImage.value,
    text: rootStyles.getPropertyValue('--text').trim(),
    muted: rootStyles.getPropertyValue('--muted').trim(),
    contentBackground: contentStyles.backgroundColor,
    contentColor: contentStyles.color,
    tabColor: tabStyles?.color || '',
    tabTextShadow: tabStyles?.textShadow || '',
    activeTabColor: activeTabStyles?.color || '',
    activeTabTextShadow: activeTabStyles?.textShadow || ''
  })
}

const omitMotionProps = (vars) => {
  const nextVars = { ...vars }
  delete nextVars.x
  delete nextVars.y
  delete nextVars.scale
  return nextVars
}

const rememberHoverBase = (element) => {
  if (!element) {
    return null
  }

  const styles = window.getComputedStyle(element)
  const base = {
    backgroundColor: styles.backgroundColor,
    borderColor: styles.borderColor,
    color: styles.color,
    boxShadow: styles.boxShadow === 'none' ? '0 0 0 rgba(0, 0, 0, 0)' : styles.boxShadow
  }

  element.__gsapHoverBase = base
  return base
}

const animateHoverSurface = (element, vars) => {
  if (!element) {
    return
  }

  gsap.killTweensOf(element)

  if (!canAnimate) {
    gsap.set(element, omitMotionProps(vars))
    return
  }

  gsap.to(element, {
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto',
    ...vars
  })
}

const resetHoverSurface = (element) => {
  if (!element) {
    return
  }

  const base = element.__gsapHoverBase || rememberHoverBase(element)
  animateHoverSurface(element, {
    y: 0,
    scale: 1,
    backgroundColor: base?.backgroundColor,
    borderColor: base?.borderColor,
    color: base?.color,
    boxShadow: base?.boxShadow
  })
}

const getTabBaseVars = (element) => ({
  backgroundColor: 'transparent',
  boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
  color: element?.classList.contains('tab-btn-active')
    ? getRootCssVar('--tab-active-text', element)
    : getRootCssVar('--tab-text', element)
})

const resetTabHighlightAnimationState = () => {
  tabHighlightTimeline?.kill()
  tabHighlightTimeline = null
  if (tabHighlightRef.value) {
    gsap.killTweensOf(tabHighlightRef.value)
  }
}

const updateTabHighlight = ({ immediate = false } = {}) => {
  const tabs = tabsRef.value
  const highlight = tabHighlightRef.value
  const activeButton = tabs?.querySelector?.('.tab-btn-active')

  resetTabHighlightAnimationState()

  if (!tabs || !highlight || !activeButton) {
    if (highlight) {
      gsap.set(highlight, {
        autoAlpha: 0,
        clearProps: 'transform,width,height'
      })
    }
    return
  }

  const tabsRect = tabs.getBoundingClientRect()
  const buttonRect = activeButton.getBoundingClientRect()
  const nextState = {
    x: buttonRect.left - tabsRect.left + tabs.scrollLeft,
    y: buttonRect.top - tabsRect.top + tabs.scrollTop,
    width: buttonRect.width,
    height: buttonRect.height,
    autoAlpha: 1
  }

  if (immediate || !canAnimate || loading.value || !hasPlayedInitialIntro) {
    gsap.set(highlight, nextState)
    return
  }

  tabHighlightTimeline = gsap.to(highlight, {
    ...nextState,
    duration: 0.26,
    ease: 'power3.out',
    onComplete: () => {
      tabHighlightTimeline = null
    }
  })
}

const syncTabButtonStates = () => {
  const buttons = tabsRef.value ? Array.from(tabsRef.value.querySelectorAll('.tab-btn')) : []
  if (!buttons.length) {
    updateTabHighlight({ immediate: true })
    return
  }

  for (const button of buttons) {
    const base = getTabBaseVars(button)
    const isHovered = button.matches(':hover')

    gsap.killTweensOf(button)
    gsap.set(button, {
      y: isHovered && canAnimate ? -1 : 0,
      scale: isHovered && canAnimate ? 1.01 : 1,
      backgroundColor: base.backgroundColor,
      boxShadow: base.boxShadow,
      color: isHovered && !button.classList.contains('tab-btn-active') ? getRootCssVar('--text') : base.color
    })
  }
}

const onTabHoverEnter = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  animateHoverSurface(element, {
    y: -1,
    scale: 1.01,
    color: element.classList.contains('tab-btn-active')
      ? getRootCssVar('--tab-active-text', element)
      : getRootCssVar('--tab-text', element)
  })
}

const onTabHoverLeave = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  const base = getTabBaseVars(element)
  animateHoverSurface(element, {
    y: 0,
    scale: 1,
    backgroundColor: base.backgroundColor,
    boxShadow: base.boxShadow,
    color: base.color
  })
}

const onThemeSwitchHoverEnter = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  rememberHoverBase(element)
  animateHoverSurface(element, {
    y: -1,
    scale: 1.03,
    color: getRootCssVar('--theme-switch-fg-hover'),
    backgroundColor: getRootCssVar('--theme-switch-bg-hover'),
    borderColor: getRootCssVar('--theme-switch-border-hover')
  })
}

const onThemeSwitchHoverLeave = (event) => {
  resetHoverSurface(event.currentTarget)
}

const onModalCloseHoverEnter = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  rememberHoverBase(element)
  animateHoverSurface(element, {
    y: -1,
    scale: 1.03,
    color: getRootCssVar('--text'),
    backgroundColor: getRootCssVar('--action-hover-bg')
  })
}

const onModalCloseHoverLeave = (event) => {
  resetHoverSurface(event.currentTarget)
}

const onContextMenuItemHoverEnter = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  rememberHoverBase(element)
  animateHoverSurface(element, {
    x: 2,
    backgroundColor: element.classList.contains('context-menu-item-danger')
      ? getRootCssVar('--action-danger-hover-bg')
      : getRootCssVar('--action-hover-bg')
  })
}

const onContextMenuItemHoverLeave = (event) => {
  const element = event.currentTarget
  if (!element) {
    return
  }

  const base = element.__gsapHoverBase || rememberHoverBase(element)
  animateHoverSurface(element, {
    x: 0,
    backgroundColor: base?.backgroundColor,
    borderColor: base?.borderColor,
    color: base?.color,
    boxShadow: base?.boxShadow
  })
}

const clearAnimationTargets = (targets) => {
  if (!targets.length) {
    return
  }

  gsap.set(targets, {
    clearProps: 'transform,opacity,visibility'
  })
}

const getIntroTargets = () => {
  const infoBlocks = contentRef.value
    ? Array.from(contentRef.value.querySelectorAll('.status, .warning, .empty'))
    : []

  return {
    topbar: topbarRef.value,
    infoBlocks
  }
}

const getVisibleBookmarkTargets = () => {
  if (!modulesRef.value) {
    return []
  }

  return Array.from(modulesRef.value.querySelectorAll('.module-section, .bookmark-row'))
}

const resetBookmarkAnimationState = () => {
  bookmarksTimeline?.kill()
  bookmarksTimeline = null
  clearAnimationTargets(getVisibleBookmarkTargets())
}

const resetDirectorySwitchAnimationState = () => {
  directorySwitchTimeline?.kill()
  directorySwitchTimeline = null
  const target = directoryViewRef.value
  if (target) {
    gsap.killTweensOf(target)
  }
  clearAnimationTargets([target].filter(Boolean))
}

const shouldAnimateDirectorySwitch = () =>
  canAnimate && !loading.value && !isDragUpdating && hasPlayedInitialIntro

const animateDirectorySwitchOut = () =>
  new Promise((resolve) => {
    const target = directoryViewRef.value

    resetDirectorySwitchAnimationState()

    if (!target || !shouldAnimateDirectorySwitch()) {
      resolve()
      return
    }

    directorySwitchTimeline = gsap.timeline({
      defaults: {
        duration: 0.16,
        ease: 'power2.in'
      },
      onComplete: () => {
        directorySwitchTimeline = null
        resolve()
      }
    })

    directorySwitchTimeline.to(target, {
      autoAlpha: 0,
      y: 14,
      scale: 0.992,
      transformOrigin: '50% 0%',
      force3D: true
    })
  })

const animateDirectorySwitchIn = () => {
  const target = directoryViewRef.value

  resetDirectorySwitchAnimationState()

  if (!target || !shouldAnimateDirectorySwitch()) {
    return
  }

  gsap.fromTo(
    target,
    {
      autoAlpha: 0,
      y: 18,
      scale: 0.992,
      transformOrigin: '50% 0%',
      force3D: true
    },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.28,
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility',
      onComplete: () => {
        directorySwitchTimeline = null
      }
    }
  )
}

const resetIntroAnimationState = () => {
  pageIntroTimeline?.kill()
  pageIntroTimeline = null

  const { topbar, infoBlocks } = getIntroTargets()
  clearAnimationTargets([topbar, ...infoBlocks].filter(Boolean))
}

const animateVisibleBookmarks = () => {
  const targets = getVisibleBookmarkTargets()

  resetBookmarkAnimationState()

  if (!targets.length) {
    return
  }

  if (!canAnimate) {
    clearAnimationTargets(targets)
    return
  }

  const animatedTargets = targets.slice(0, MAX_ANIMATED_BOOKMARKS)
  const remainingTargets = targets.slice(MAX_ANIMATED_BOOKMARKS)

  clearAnimationTargets(remainingTargets)

  gsap.set(animatedTargets, {
    autoAlpha: 0,
    y: 22,
    scale: 0.985,
    transformOrigin: '50% 0%',
    force3D: true
  })

  bookmarksTimeline = gsap.timeline({
    defaults: {
      duration: 0.5,
      ease: 'power3.out'
    }
  })

  bookmarksTimeline.to(animatedTargets, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    stagger: 0.04,
    clearProps: 'transform,opacity,visibility'
  })
}

const queueBookmarkAnimation = () => {
  if (loading.value || bookmarkAnimationQueued) {
    return
  }

  bookmarkAnimationQueued = true
  nextTick(() => {
    bookmarkAnimationQueued = false
    animateVisibleBookmarks()
  })
}

const scheduleInitialIntro = () => {
  if (loading.value || isDragUpdating || initialIntroQueued || hasPlayedInitialIntro) {
    return
  }

  initialIntroQueued = true
  nextTick(() => {
    initialIntroQueued = false

    if (loading.value || isDragUpdating || hasPlayedInitialIntro) {
      return
    }

    hasPlayedInitialIntro = true
    resetIntroAnimationState()
    resetBookmarkAnimationState()
    resetDirectorySwitchAnimationState()
    nextTick(syncTabButtonStates)
    nextTick(() => updateTabHighlight({ immediate: true }))
  })
}

const playPageIntro = () => {
  resetIntroAnimationState()

  const { topbar, infoBlocks } = getIntroTargets()

  if (!topbar) {
    return
  }

  if (!canAnimate) {
    clearAnimationTargets([topbar, ...infoBlocks].filter(Boolean))
    queueBookmarkAnimation()
    return
  }

  gsap.set(topbar, {
    autoAlpha: 0,
    y: -20,
    force3D: true
  })

  if (infoBlocks.length) {
    gsap.set(infoBlocks, {
      autoAlpha: 0,
      y: 12,
      force3D: true
    })
  }

  pageIntroTimeline = gsap.timeline({
    defaults: {
      duration: 0.55,
      ease: 'power3.out'
    }
  })

  pageIntroTimeline.to(topbar, {
    autoAlpha: 1,
    y: 0,
    clearProps: 'transform,opacity,visibility'
  })

  if (infoBlocks.length) {
    pageIntroTimeline.to(
      infoBlocks,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.38,
        stagger: 0.06,
        clearProps: 'transform,opacity,visibility'
      },
      '-=0.2'
    )
  }

  pageIntroTimeline.add(queueBookmarkAnimation, '-=0.14')
}

const animateLatestModal = () => {
  const cards = pageShellRef.value ? Array.from(pageShellRef.value.querySelectorAll('.modal-card')) : []
  const latestCard = cards.at(-1)

  if (!latestCard || !canAnimate) {
    return
  }

  gsap.killTweensOf(latestCard)
  gsap.fromTo(
    latestCard,
    {
      autoAlpha: 0,
      y: 18,
      scale: 0.98,
      transformOrigin: '50% 0%',
      force3D: true
    },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.28,
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility'
    }
  )
}

const animateContextMenu = () => {
  const menu = pageShellRef.value?.querySelector('.context-menu')

  if (!menu || !canAnimate) {
    return
  }

  gsap.killTweensOf(menu)
  gsap.fromTo(
    menu,
    {
      autoAlpha: 0,
      y: -8,
      scale: 0.96,
      transformOrigin: 'top left',
      force3D: true
    },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility'
    }
  )
}

const openBackgroundSettings = () => {
  closeContextMenu()
  backgroundDraft.value = { ...backgroundSettings.value }
  backgroundError.value = ''
  backgroundSettingsOpen.value = true
  nextTick(animateLatestModal)
}

const closeBackgroundSettings = () => {
  backgroundSettingsOpen.value = false
  backgroundError.value = ''
}

const persistBackgroundSettings = async (nextSettings) => {
  const saved = await saveBackgroundSettings(nextSettings)
  backgroundSettings.value = saved
  backgroundDraft.value = { ...saved }
  backgroundError.value = ''
  return saved
}

const saveBackgroundSettingsForm = async () => {
  const nextImageUrl = backgroundDraft.value.imageUrl.trim()

  if (backgroundDraft.value.enabled && !nextImageUrl) {
    backgroundError.value = '请先填写背景图地址或上传图片。'
    return
  }

  try {
    await persistBackgroundSettings({
      ...backgroundDraft.value,
      imageUrl: nextImageUrl,
      enabled: backgroundDraft.value.enabled
    })
    closeBackgroundSettings()
  } catch (error) {
    backgroundError.value = error instanceof Error ? error.message : '背景设置保存失败。'
  }
}

const clearBackgroundImage = async () => {
  const cleared = await clearBackgroundSettings()
  backgroundSettings.value = cleared
  backgroundDraft.value = { ...cleared }
  backgroundError.value = ''
}

const triggerBackgroundUpload = () => {
  backgroundFileInput.value?.click?.()
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'))
    reader.readAsDataURL(file)
  })

const handleBackgroundUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    backgroundError.value = '请选择图片文件。'
    return
  }

  try {
    const dataUrl = await readFileAsDataUrl(file)
    backgroundDraft.value.imageUrl = dataUrl
    backgroundDraft.value.enabled = true
    backgroundError.value = ''
  } catch (error) {
    backgroundError.value = error instanceof Error ? error.message : '读取图片失败。'
  }
}

const syncStatusForMode = () => {
  if (hasChromeBookmarks()) {
    status.value = '已连接 Chrome 书签。'
    warning.value = ''
    return
  }

  status.value = ''
  warning.value = ''
}

const switchTab = (tabId) => {
  if (!tabId) {
    return
  }

  if (isTabSwitchAnimating) {
    pendingTabSwitchId = tabId
    return
  }

  if (tabId === activeTab.value) {
    return
  }

  const commitSwitch = () => {
    activeTab.value = tabId
    localStorage.setItem(ACTIVE_TAB_KEY, tabId)
  }

  if (!shouldAnimateDirectorySwitch()) {
    commitSwitch()
    return
  }

  isTabSwitchAnimating = true

  animateDirectorySwitchOut()
    .then(async () => {
      commitSwitch()
      await nextTick()
      animateDirectorySwitchIn()
    })
    .finally(() => {
      isTabSwitchAnimating = false
      const nextTabId = pendingTabSwitchId
      pendingTabSwitchId = ''
      if (nextTabId && nextTabId !== activeTab.value) {
        switchTab(nextTabId)
      }
    })
}

const loadBookmarks = async () => {
  loading.value = true

  if (!hasChromeBookmarks()) {
    bookmarkTree.value = JSON.parse(JSON.stringify(fallbackTree))
    chromeRootFolderId.value = ''
    syncStatusForMode()
    loading.value = false
    return
  }

  try {
    const { nodes, rootFolderId } = await loadBookmarksFromChrome()
    bookmarkTree.value = nodes
    chromeRootFolderId.value = rootFolderId
    syncStatusForMode()
  } catch (error) {
    console.error('bookmark fetch failed', error)
    status.value = '读取书签失败，显示演示内容。'
    warning.value = '检查 Chrome 权限后重新打开新标签页即可。'
    bookmarkTree.value = JSON.parse(JSON.stringify(fallbackTree))
    chromeRootFolderId.value = ''
  } finally {
    loading.value = false
  }
}

const getChromeNodeOps = () => {
  const api = window.chrome?.bookmarks
  return {
    update: (id, title) =>
      wrapChromeCallback((resolve) => api.update(id, { title }, resolve)),
    remove: (id) => wrapChromeCallback((resolve) => api.remove(id, resolve)),
    removeTree: (id) => wrapChromeCallback((resolve) => api.removeTree(id, resolve)),
    move: (id, destination = {}) =>
      wrapChromeCallback((resolve) => api.move(id, destination, resolve))
  }
}

const openBookmarkUrl = (url, options = {}) => {
  if (!url) {
    return
  }

  const shouldOpenInBackground = Boolean(options?.background)
  if (typeof window !== 'undefined' && window.chrome?.tabs?.create) {
    window.chrome.tabs.create({ url, active: !shouldOpenInBackground }, () => {
      const error = window.chrome?.runtime?.lastError
      if (error) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

const deleteNode = async (node) => {
  if (!node?.id) {
    return false
  }

  const targetId = String(node.id)

  try {
    if (hasChromeBookmarks()) {
      const ops = getChromeNodeOps()
      if (hasChildren(node)) {
        await ops.removeTree(targetId)
      } else {
        await ops.remove(targetId)
      }
    }

    bookmarkTree.value = pruneNodesByIds(bookmarkTree.value, [targetId])
    status.value = `已删除${hasChildren(node) ? '文件夹' : '书签'}「${node.title || '未命名'}」。`
    warning.value = hasChromeBookmarks() ? '' : '当前为演示数据，删除仅在页面内生效。'
    if (editingNode.value && String(editingNode.value.id) === targetId) {
      closeEdit()
    }
    closeContextMenu()
    return true
  } catch (error) {
    console.error('delete failed', error)
    status.value = '删除失败。'
    warning.value = error instanceof Error ? error.message : '请检查 Chrome 书签权限。'
    return false
  }
}

const openDeleteConfirm = (node) => {
  if (!node) return
  closeContextMenu()
  deletingNode.value = node
  nextTick(animateLatestModal)
}

const closeDeleteConfirm = () => {
  deletingNode.value = null
}

const confirmDelete = async () => {
  if (!deletingNode.value) {
    return
  }
  const success = await deleteNode(deletingNode.value)
  if (success) {
    closeDeleteConfirm()
  }
}

const openEdit = (node) => {
  closeContextMenu()
  editingNode.value = node
  editingTitle.value = node?.title || ''
  editError.value = ''
  nextTick(animateLatestModal)
}

const closeEdit = () => {
  editingNode.value = null
  editingTitle.value = ''
  editError.value = ''
}

const saveEdit = async () => {
  if (!editingNode.value) {
    return
  }

  const nextTitle = editingTitle.value.trim()
  if (!nextTitle) {
    editError.value = '名称不能为空。'
    return
  }

  const targetId = String(editingNode.value.id)

  try {
    if (hasChromeBookmarks()) {
      const ops = getChromeNodeOps()
      await ops.update(targetId, nextTitle)
    }

    bookmarkTree.value = renameNodeInTree(bookmarkTree.value, targetId, nextTitle)
    status.value = `已重命名为「${nextTitle}」。`
    warning.value = hasChromeBookmarks() ? '' : '当前为演示数据，重命名仅在页面内生效。'
    closeEdit()
  } catch (error) {
    console.error('rename failed', error)
    editError.value = error instanceof Error ? error.message : '重命名失败。'
  }
}

const normalizeParentId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return String(value)
}

const getChromeMoveParentId = (parentId, fallbackRootId = '') => {
  if (parentId !== null && parentId !== undefined && parentId !== '') {
    return String(parentId)
  }
  return fallbackRootId || undefined
}

const getChromeMoveIndex = (event) => {
  const oldIndex = Number.isInteger(event.oldDraggableIndex) ? event.oldDraggableIndex : event.oldIndex
  const newIndex = Number.isInteger(event.newDraggableIndex) ? event.newDraggableIndex : event.newIndex
  const sourceParentId = normalizeParentId(event.from?.dataset.groupParentId || null)
  const targetParentId = normalizeParentId(event.to?.dataset.groupParentId || null)

  if (!Number.isInteger(newIndex) || newIndex < 0) {
    return null
  }

  if (
    Number.isInteger(oldIndex) &&
    oldIndex >= 0 &&
    sourceParentId === targetParentId &&
    oldIndex < newIndex
  ) {
    return newIndex + 1
  }

  return newIndex
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const nodeContainsId = (node, targetId) => {
  if (!node) {
    return false
  }
  if (String(node.id) === String(targetId)) {
    return true
  }
  if (!hasChildren(node)) {
    return false
  }
  return node.children.some((child) => nodeContainsId(child, targetId))
}

const canMoveNode = (draggedId, targetParentId) => {
  const sourceNode = findNodeById(bookmarkTree.value, draggedId)
  const sourceLocation = getNodeLocation(bookmarkTree.value, draggedId)
  if (!sourceNode) {
    return false
  }
  if (!sourceLocation) {
    return false
  }
  if (!targetParentId) {
    return sourceLocation.parentId === null
  }
  if (String(sourceNode.id) === String(targetParentId)) {
    return false
  }
  return !nodeContainsId(sourceNode, targetParentId)
}

const isBookmarkDragActive = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.bookmarkDragging === 'true'

const logDrag = (message, details = {}) => {
  if (import.meta.env.DEV) {
    console.debug(`[bookmark drag] ${message}`, details)
  }
}

const handleBookmarkDragStart = (nodeId) => {
  dragSourceId.value = nodeId ? String(nodeId) : ''
  clearDragDropTargets()
  logDrag('start', { nodeId: dragSourceId.value })
}

const clearDragDropTargets = () => {
  activeDropFolderId.value = ''
  activeDropTabId.value = ''
}

const setActiveDropFolder = (folderId) => {
  activeDropFolderId.value = folderId ? String(folderId) : ''
  if (activeDropFolderId.value) {
    activeDropTabId.value = ''
  }
}

const setActiveDropTab = (tabId) => {
  activeDropTabId.value = tabId ? String(tabId) : ''
  if (activeDropTabId.value) {
    activeDropFolderId.value = ''
  }
}

const getClientPoint = (event) => {
  const source = event?.touches?.[0] || event?.changedTouches?.[0] || event
  const clientX = Number(source?.clientX)
  const clientY = Number(source?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null
  }

  return { clientX, clientY }
}

const resolveExternalDropFolderId = (event) => {
  if (activeDropTabId.value) {
    return activeDropTabId.value
  }

  if (activeDropFolderId.value) {
    return activeDropFolderId.value
  }

  const point = getClientPoint(event?.originalEvent)
  if (!point || typeof document === 'undefined') {
    return null
  }

  const element = document.elementFromPoint(point.clientX, point.clientY)
  const tabButton = element?.closest?.('[data-folder-tab-id]')
  const tabFolderId = String(tabButton?.dataset.folderTabId || '')
  if (tabFolderId && tabFolderId !== ROOT_BOOKMARKS_TAB_ID) {
    return tabFolderId
  }

  const folderItem = element?.closest?.('.bookmark-item.is-folder')
  const folderTarget = element?.closest?.('[data-folder-drop-id]')
  const folderId = String(folderTarget?.dataset.folderDropId || '')
  if (!folderId || !folderItem) {
    return null
  }

  return folderId
}

const getFolderAppendIndex = (folderId) => {
  const folder = findNodeById(bookmarkTree.value, folderId)
  return Array.isArray(folder?.children) ? folder.children.length : 0
}

const applyNodeMove = async ({ targetId, targetParentId, targetIndex, chromeIndex, successStatus, demoWarning }) => {
  isDragUpdating = true
  try {
    bookmarkTree.value = moveNodeToFinalIndexInTree(bookmarkTree.value, targetId, targetParentId, targetIndex)
    await nextTick()

    try {
      if (hasChromeBookmarks()) {
        const ops = getChromeNodeOps()
        const nextChromeIndex = Number.isInteger(chromeIndex) ? chromeIndex : targetIndex
        if (!Number.isInteger(nextChromeIndex) || nextChromeIndex < 0) {
          return
        }
        await ops.move(targetId, {
          parentId: getChromeMoveParentId(targetParentId, chromeRootFolderId.value),
          index: nextChromeIndex
        })
        await loadBookmarks()
      }

      status.value = successStatus
      warning.value = hasChromeBookmarks() ? '' : demoWarning
    } catch (error) {
      console.error('drag sync failed', error)
      status.value = '同步拖拽结果失败。'
      warning.value = error instanceof Error ? error.message : '请检查 Chrome 书签权限。'
      await loadBookmarks()
    }
  } finally {
    isDragUpdating = false
    clearDragDropTargets()
  }
}

const handleFolderDragTargetChange = (folderId) => {
  if (!isBookmarkDragActive()) {
    clearDragDropTargets()
    return
  }

  const nextFolderId =
    folderId && dragSourceId.value && canMoveNode(dragSourceId.value, folderId)
      ? String(folderId)
      : ''

  if (nextFolderId !== activeDropFolderId.value) {
    logDrag('folder-target', {
      sourceId: dragSourceId.value,
      targetId: nextFolderId || null
    })
  }
  setActiveDropFolder(nextFolderId)
}

const handleTabDragOver = (tabId, event) => {
  if (
    !isBookmarkDragActive() ||
    tabId === ROOT_BOOKMARKS_TAB_ID ||
    !dragSourceId.value ||
    !canMoveNode(dragSourceId.value, tabId)
  ) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (activeDropTabId.value !== String(tabId)) {
    logDrag('tab-target', {
      sourceId: dragSourceId.value,
      targetId: String(tabId)
    })
  }
  setActiveDropTab(tabId)
}

const handleTabDragLeave = (tabId, event) => {
  if (event.currentTarget?.contains?.(event.relatedTarget)) {
    return
  }
  if (activeDropTabId.value === String(tabId)) {
    activeDropTabId.value = ''
  }
}

const handleTabDrop = (tabId, event) => {
  if (
    !isBookmarkDragActive() ||
    tabId === ROOT_BOOKMARKS_TAB_ID ||
    !dragSourceId.value ||
    !canMoveNode(dragSourceId.value, tabId)
  ) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  setActiveDropTab(tabId)
}

const handleDragEnd = async (event) => {
  closeContextMenu()

  if (!event) {
    clearDragDropTargets()
    dragSourceId.value = ''
    return
  }

  const targetId = String(event.item?.dataset.nodeId || dragSourceId.value || '')
  if (!targetId) {
    clearDragDropTargets()
    dragSourceId.value = ''
    return
  }

  const sourceLocation = getNodeLocation(bookmarkTree.value, targetId)
  const externalTargetFolderId = resolveExternalDropFolderId(event)
  logDrag('end', {
    sourceId: targetId,
    targetId: externalTargetFolderId,
    sourceParentId: sourceLocation?.parentId ?? null
  })
  if (externalTargetFolderId && canMoveNode(targetId, externalTargetFolderId)) {
    const sourceParentId = normalizeParentId(sourceLocation?.parentId)
    if (sourceParentId !== normalizeParentId(externalTargetFolderId)) {
      const targetFolder = findNodeById(bookmarkTree.value, externalTargetFolderId)
      const targetFolderTitle = targetFolder?.title || '未命名目录'
      const appendIndex = getFolderAppendIndex(externalTargetFolderId)

      await applyNodeMove({
        targetId,
        targetParentId: externalTargetFolderId,
        targetIndex: appendIndex,
        chromeIndex: appendIndex,
        successStatus: `已移动到目录「${targetFolderTitle}」。`,
        demoWarning: '当前为演示数据，移动仅在页面内生效。'
      })
      dragSourceId.value = ''
      return
    }
  }

  if (event.from === event.to && event.oldIndex === event.newIndex) {
    clearDragDropTargets()
    dragSourceId.value = ''
    return
  }

  const targetParentId = normalizeParentId(event.to?.dataset.groupParentId || null)
  const nextIndex = Number.isInteger(event.newDraggableIndex) ? event.newDraggableIndex : event.newIndex
  if (!Number.isInteger(nextIndex) || nextIndex < 0) {
    clearDragDropTargets()
    dragSourceId.value = ''
    return
  }

  await applyNodeMove({
    targetId,
    targetParentId,
    targetIndex: nextIndex,
    chromeIndex: getChromeMoveIndex(event),
    successStatus: '已更新书签顺序。',
    demoWarning: ''
  })
  dragSourceId.value = ''
}

const openContextMenu = (node, point) => {
  if (!node || !point) {
    return
  }

  const menuWidth = 160
  const menuHeight = 112
  const x = clamp(point.x, 8, window.innerWidth - menuWidth - 8)
  const y = clamp(point.y, 8, window.innerHeight - menuHeight - 8)
  contextMenu.value = { visible: true, x, y, node }
  nextTick(animateContextMenu)
}

const openTabContextMenu = (tabId, event) => {
  if (!tabId || tabId === ROOT_BOOKMARKS_TAB_ID) {
    return
  }

  const node = findNodeById(bookmarkTree.value, tabId)
  if (!node) {
    return
  }

  openContextMenu(node, { x: event.clientX, y: event.clientY })
}

const closeContextMenu = () => {
  if (!contextMenu.value.visible) {
    return
  }
  contextMenu.value = { visible: false, x: 0, y: 0, node: null }
}

const handleGlobalKeydown = (event) => {
  if (event.key !== 'Escape') {
    return
  }

  if (contextMenu.value.visible) {
    closeContextMenu()
    return
  }

  if (deletingNode.value) {
    closeDeleteConfirm()
    return
  }

  if (editingNode.value) {
    closeEdit()
    return
  }

  if (backgroundSettingsOpen.value) {
    closeBackgroundSettings()
  }
}

const handleContextRename = () => {
  if (!contextNode.value) return
  openEdit(contextNode.value)
}

const handleContextDelete = () => {
  if (!contextNode.value) return
  openDeleteConfirm(contextNode.value)
}

watch(editingNode, async (node) => {
  if (!node) {
    return
  }

  await nextTick()
  editInput.value?.focus?.()
  editInput.value?.select?.()
})

watch(tabOptions, (tabs) => {
  if (!tabs.length) {
    activeTab.value = ''
    localStorage.removeItem(ACTIVE_TAB_KEY)
    nextTick(() => updateTabHighlight({ immediate: true }))
    return
  }

  const savedTabId = localStorage.getItem(ACTIVE_TAB_KEY) || ''
  const exists = tabs.some((tab) => tab.id === activeTab.value)
  if (!exists) {
    activeTab.value = tabs.some((tab) => tab.id === savedTabId) ? savedTabId : tabs[0].id
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab.value)
  }

  nextTick(() => updateTabHighlight({ immediate: true }))
})

watch(activeTab, (nextTab, previousTab) => {
  if (
    !nextTab ||
    !previousTab ||
    nextTab === previousTab ||
    loading.value ||
    isDragUpdating ||
    !hasPlayedInitialIntro
  ) {
    return
  }

  nextTick(syncTabButtonStates)
  nextTick(() => updateTabHighlight())
  queueBookmarkAnimation()
})

watch(theme, () => {
  nextTick(syncTabButtonStates)
  nextTick(() => updateTabHighlight({ immediate: true }))
  nextTick(() => logContrastState('theme-change'))
})

watch(hasBackgroundImage, () => {
  nextTick(() => logContrastState('background-change'))
})

watch(animationEnabled, (enabled) => {
  localStorage.setItem(ANIMATION_ENABLED_KEY, String(enabled))
  applyAnimationAvailability()

  if (!canAnimate) {
    clearThemeTransitionState()
    resetIntroAnimationState()
    resetBookmarkAnimationState()
    resetDirectorySwitchAnimationState()
    resetTabHighlightAnimationState()
    clearAnimationTargets(getVisibleBookmarkTargets())
    clearAnimationTargets([directoryViewRef.value, tabHighlightRef.value].filter(Boolean))
  }

  nextTick(syncTabButtonStates)
  nextTick(() => updateTabHighlight({ immediate: true }))
})

watch(
  () => previewBackgroundSettings.value.tabRadius,
  () => {
    nextTick(() => updateTabHighlight({ immediate: true }))
  }
)

watch(
  () => warning.value,
  () => {
    nextTick(() => updateTabHighlight({ immediate: true }))
  }
)

watch(
  () => visibleNodes.value,
  (nextNodes, previousNodes) => {
    if (
      !previousNodes ||
      nextNodes === previousNodes ||
      loading.value ||
      isDragUpdating ||
      !hasPlayedInitialIntro
    ) {
      return
    }

    queueBookmarkAnimation()
  }
)

watch(loading, (isLoading, wasLoading) => {
  if (!wasLoading || isLoading || isDragUpdating) {
    return
  }

  scheduleInitialIntro()
})

onMounted(() => {
  initAnimationPreference()
  initMotionPreferences()
  initTheme()
  initActiveTab()
  void initBackgroundSettings()
  void loadBookmarks()

  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('resize', updateTabHighlight)
  window.addEventListener('scroll', closeContextMenu, true)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  motionMatcher?.revert()
  pageIntroTimeline?.kill()
  bookmarksTimeline?.kill()
  directorySwitchTimeline?.kill()
  tabHighlightTimeline?.kill()
  themeToggleTimeline?.kill()
  const hoverTargets = pageShellRef.value?.querySelectorAll?.('.tab-btn, .theme-switch, .modal-close, .context-menu-item')
  if (hoverTargets?.length) {
    gsap.killTweensOf(Array.from(hoverTargets))
  }
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('resize', updateTabHighlight)
  window.removeEventListener('scroll', closeContextMenu, true)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <main ref="pageShellRef" class="page-shell" :style="pageShellStyle" @click="closeContextMenu">
    <div
      ref="pageBackdropRef"
      class="page-backdrop"
      :class="{ 'is-active': hasBackgroundImage }"
      :style="pageBackdropStyle"
    ></div>

    <div ref="contentRef" class="content" :class="{ 'content-with-background': hasBackgroundImage }">
      <header ref="topbarRef" class="topbar">
        <div class="topbar-main">
          <div class="brand-block">
            <div class="brand-mark" aria-hidden="true">
              <Bookmark :size="20" :stroke-width="2.25" />
            </div>
            <div>
              <h1>我的书签</h1>
            </div>
          </div>
          <div class="topbar-actions">
            <button
              class="icon-button"
              type="button"
              aria-label="设置背景"
              title="设置背景"
              @click="openBackgroundSettings"
            >
              <Palette :size="17" />
            </button>
            <button
              ref="themeSwitchRef"
              class="icon-button"
              type="button"
              :aria-label="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
              :title="theme === 'dark' ? '切换为浅色模式' : '切换为夜间模式'"
              @click="toggleTheme"
            >
              <span ref="themeSwitchIconRef" class="icon-glyph" aria-hidden="true">
                <Moon v-if="theme === 'dark'" :size="17" />
                <Sun v-else :size="17" />
              </span>
            </button>
          </div>
        </div>
        <nav ref="tabsRef" class="tabs" aria-label="书签分类">
          <span ref="tabHighlightRef" class="tab-highlight" aria-hidden="true"></span>
          <button
            v-for="tab in tabOptions"
            :key="tab.id"
            class="tab-btn"
            :class="{
              'tab-btn-active': activeTab === tab.id,
              'tab-btn-drop-target': activeDropTabId === tab.id
            }"
            type="button"
            :data-folder-tab-id="tab.id === ROOT_BOOKMARKS_TAB_ID ? null : tab.id"
            :title="tab.id === ROOT_BOOKMARKS_TAB_ID ? '' : '拖到这里可移动到该目录'"
            @click="switchTab(tab.id)"
            @contextmenu.prevent.stop="openTabContextMenu(tab.id, $event)"
            @dragover="handleTabDragOver(tab.id, $event)"
            @dragleave="handleTabDragLeave(tab.id, $event)"
            @drop="handleTabDrop(tab.id, $event)"
          >
            <Bookmark v-if="tab.id === ROOT_BOOKMARKS_TAB_ID" :size="14" />
            {{ tab.label }}
          </button>
        </nav>
        <div v-if="!loading && status" class="status-bar" aria-live="polite">
          <span class="status-dot"></span>
          {{ status }}
        </div>
      </header>

      <div v-if="loading" class="status">
        <span class="pulse"></span>
        {{ status }}
      </div>

      <p v-if="warning" class="warning">{{ warning }}</p>

      <div v-if="!loading" ref="directoryViewRef" class="directory-view">
        <div v-if="visibleNodes.length" ref="modulesRef" class="modules">
          <BookmarkGroup
            :nodes="visibleNodes"
            :parent-id="visibleParentId"
            :depth="0"
            :can-animate="bookmarkMotionEnabled"
            :active-drop-folder-id="activeDropFolderId"
            :can-move="canMoveNode"
            @drag-start="handleBookmarkDragStart"
            @drag-end="handleDragEnd"
            @drag-target-change="handleFolderDragTargetChange"
            @open-bookmark="openBookmarkUrl"
            @open-context-menu="openContextMenu"
          />
        </div>

        <p v-else class="empty">暂无书签，请先在 Chrome 中添加内容。</p>
      </div>
    </div>

    <div v-if="backgroundSettingsOpen" class="modal-overlay modal-overlay-clear" @click.self="closeBackgroundSettings">
      <div class="modal-card modal-card-wide" role="dialog" aria-modal="true" aria-label="背景设置">
        <div class="modal-header">
          <h3 class="modal-title">背景设置</h3>
          <button
            class="modal-close"
            type="button"
            aria-label="关闭背景设置"
            @click="closeBackgroundSettings"
          >
            <X :size="16" />
          </button>
        </div>

        <p class="modal-meta">支持背景图地址、本地上传、显示强度和磨砂效果，保存后会持久化到本地。</p>

        <section class="background-settings-panel">
          <div class="settings-panel-header">
            <h4 class="settings-panel-title">背景调整</h4>
            <p class="settings-panel-meta">设置背景图地址、上传、启用和显示效果。</p>
          </div>

          <label class="modal-field">
            <span>图片地址</span>
            <input
              v-model="backgroundDraft.imageUrl"
              type="url"
              placeholder="https://example.com/background.jpg"
              spellcheck="false"
            />
          </label>

          <div class="background-actions">
            <button class="action-button" type="button" @click="triggerBackgroundUpload">上传本地图片</button>
            <button class="action-button" type="button" @click="clearBackgroundImage">清除背景</button>
          </div>

          <label class="background-switch">
            <input v-model="backgroundDraft.enabled" type="checkbox" />
            <span>启用背景图</span>
          </label>

          <label class="modal-field modal-field-range">
            <span>背景显示强度</span>
            <div class="range-row">
              <input v-model.number="backgroundDraft.opacity" type="range" min="0.2" max="1" step="0.01" />
              <strong>{{ Math.round(backgroundDraft.opacity * 100) }}%</strong>
            </div>
          </label>

          <label class="modal-field modal-field-range">
            <span>背景磨砂强度</span>
            <div class="range-row">
              <input v-model.number="backgroundDraft.backdropBlur" type="range" min="0" max="24" step="1" />
              <strong>{{ Math.round(backgroundDraft.backdropBlur) }}px</strong>
            </div>
            </label>
        </section>

        <p v-if="backgroundError" class="modal-error">{{ backgroundError }}</p>

        <div class="modal-actions">
          <button class="action-button" type="button" @click="closeBackgroundSettings">取消</button>
          <button class="action-button action-button-primary" type="button" @click="saveBackgroundSettingsForm">
            保存
          </button>
        </div>

        <input
          ref="backgroundFileInput"
          class="visually-hidden"
          type="file"
          accept="image/*"
          @change="handleBackgroundUpload"
        />
      </div>
    </div>

    <div v-if="editingNode" class="modal-overlay" @click.self="closeEdit">
      <div class="modal-card" role="dialog" aria-modal="true" :aria-label="`重命名${editingKind}`">
        <div class="modal-header">
          <h3 class="modal-title">重命名{{ editingKind }}</h3>
          <button
            class="modal-close"
            type="button"
            aria-label="关闭重命名对话框"
            @click="closeEdit"
          >
            <X :size="16" />
          </button>
        </div>

        <p class="modal-meta">{{ editingNode.title || `未命名${editingKind}` }}</p>

        <label class="modal-field">
          <span>名称</span>
          <input
            ref="editInput"
            v-model="editingTitle"
            type="text"
            spellcheck="false"
            @keydown.enter.prevent="saveEdit"
          />
        </label>

        <p v-if="editError" class="modal-error">{{ editError }}</p>

        <div class="modal-actions">
          <button class="action-button" type="button" @click="closeEdit">取消</button>
          <button class="action-button action-button-primary" type="button" @click="saveEdit">
            保存
          </button>
        </div>
      </div>
    </div>

    <div v-if="deletingNode" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card" role="dialog" aria-modal="true" :aria-label="`删除${deletingKind}`">
        <div class="modal-header">
          <h3 class="modal-title">确认删除{{ deletingKind }}</h3>
          <button
            class="modal-close"
            type="button"
            aria-label="关闭删除确认"
            @click="closeDeleteConfirm"
          >
            <X :size="16" />
          </button>
        </div>

        <p class="modal-meta">
          将删除{{ deletingKind }}「{{ deletingNode.title || `未命名${deletingKind}` }}」。
          {{ hasChildren(deletingNode) ? '此操作会同时删除其下全部内容。' : '此操作不可撤销。' }}
        </p>

        <div class="modal-actions">
          <button class="action-button" type="button" @click="closeDeleteConfirm">取消</button>
          <button class="action-button action-button-danger" type="button" @click="confirmDelete">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenu.visible && contextNode"
      class="context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <button
        class="context-menu-item"
        type="button"
        @click="handleContextRename"
      >
        <Pencil :size="15" />
        重命名{{ contextKind }}
      </button>
      <button
        class="context-menu-item context-menu-item-danger"
        type="button"
        @click="handleContextDelete"
      >
        <Trash2 :size="15" />
        删除{{ contextKind }}
      </button>
    </div>
  </main>
</template>
