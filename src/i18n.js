import { ref } from 'vue'
import { LOCALE_KEY } from './constants.js'

const zh = {
  'app.title': '我的书签',
  'topbar.search': '搜索标题或地址',
  'topbar.export': '导出备份',
  'topbar.settings': '显示设置',
  'topbar.toLight': '切换为浅色模式',
  'topbar.toDark': '切换为夜间模式',
  'lang.toEn': '切换为英文',
  'lang.toZh': '切换为中文',
  'nav.back': '返回上级',
  'nav.tabs': '书签分类',
  'nav.tabTip': '拖动可调整目录顺序，书签拖到这里可移入',
  'name.folder': '未命名目录',
  'name.bookmark': '未命名书签',
  'name.untitled': '未命名',
  'name.bar': '书签栏',
  'tab.all': '全部书签',
  'empty.none': '暂无书签',
  'empty.hint': '在 Chrome 书签管理器里添加内容。',
  'empty.search': '没有匹配的书签',
  'empty.searchHint': '换个标题或地址再试。',
  'recent.label': '最近访问',
  'module.open': '打开目录 {title}',
  'module.locked': '该目录已加密',
  'module.unlock': '输入密码',
  'module.count1': '{count} 项',
  'module.count': '{count} 项',
  'menu.newRoot': '新建目录',
  'menu.newFolder': '新建子目录',
  'menu.renameFolder': '重命名文件夹',
  'menu.renameBookmark': '重命名书签',
  'menu.setPassword': '设置访问密码',
  'menu.changePassword': '修改访问密码',
  'menu.removePassword': '移除访问密码',
  'menu.deleteFolder': '删除文件夹',
  'menu.deleteBookmark': '删除书签',
  'kind.folder': '文件夹',
  'kind.bookmark': '书签',
  'create.title': '新建目录',
  'create.in': '创建在「{name}」',
  'create.action': '创建',
  'action.cancel': '取消',
  'action.save': '保存',
  'action.closeNamed': '关闭{name}',
  'field.name': '名称',
  'rename.titleFolder': '重命名文件夹',
  'rename.titleBookmark': '重命名书签',
  'delete.titleFolder': '确认删除文件夹',
  'delete.titleBookmark': '确认删除书签',
  'delete.labelFolder': '删除文件夹',
  'delete.labelBookmark': '删除书签',
  'delete.bodyFolder': '将删除文件夹「{name}」。',
  'delete.bodyBookmark': '将删除书签「{name}」。',
  'delete.children': '此操作会同时删除其下全部内容。',
  'delete.undo': '此操作不可撤销。',
  'delete.confirm': '确认删除',
  'access.titleUnlock': '输入目录密码',
  'access.titleRemove': '移除目录密码',
  'access.titleChange': '修改目录密码',
  'access.titleSet': '设置目录密码',
  'access.unlock': '解锁',
  'access.remove': '移除',
  'access.password': '访问密码',
  'access.current': '当前密码',
  'access.new': '新密码',
  'access.confirm': '确认新密码',
  'access.mismatch': '两次输入的密码不一致。',
  'settings.title': '显示设置',
  'settings.desc': '卡片尺寸与字体对所有标签页生效；可从预设图库选择背景，或上传本地图片/视频。',
  'settings.layout': '版面',
  'settings.cardSize': '卡片尺寸',
  'settings.latin': '西文字体',
  'settings.cjk': '中文字体',
  'settings.background': '背景',
  'settings.enable': '启用背景图',
  'settings.upload': '上传图片或视频',
  'settings.clear': '清除背景',
  'settings.opacity': '卡片不透明度',
  'settings.presets': '预设壁纸',
  'settings.galleryLoading': '正在加载预设壁纸…',
  'settings.galleryEmpty': '暂无预设壁纸，可上传本地图片或视频。',
  'settings.galleryError': '预设壁纸加载失败，仍可上传本地图片或视频。',
  'settings.galleryRetry': '重新加载',
  'settings.videoTag': '视频',
  'size.0': '特小',
  'size.1': '小',
  'size.2': '标准',
  'size.3': '大',
  'font.latin.system': '系统',
  'font.latin.inter': 'Inter',
  'font.latin.roboto': 'Roboto',
  'font.latin.open-sans': 'Open Sans',
  'font.latin.lato': 'Lato',
  'font.latin.montserrat': 'Montserrat',
  'font.latin.poppins': 'Poppins',
  'font.latin.nunito-sans': 'Nunito Sans',
  'font.latin.source-sans-3': 'Source Sans 3',
  'font.latin.plex': 'IBM Plex Sans',
  'font.latin.geist': 'Geist',
  'font.latin.manrope': 'Manrope',
  'font.cjk.system': '系统',
  'font.cjk.noto': '思源',
  'font.cjk.noto-serif': '思源宋体',
  'font.cjk.lxgw-wenkai': '霞鹜文楷',
  'font.cjk.zcool-xiaowei': '站酷小薇',
  'font.cjk.zcool-qingke': '站酷庆科黄油体',
  'font.cjk.ma-shan-zheng': '马善政',
  'font.cjk.long-cang': '龙藏体',
  'font.cjk.liu-jian-mao-cao': '刘建毛草',
  'font.cjk.misans': 'MiSans',
  'font.cjk.harmony': '鸿蒙',
  'warn.demoDelete': '当前为演示数据，删除仅在页面内生效。',
  'warn.demoCreate': '当前为演示数据，新建目录仅在页面内生效。',
  'warn.demoRename': '当前为演示数据，重命名仅在页面内生效。',
  'warn.demoOrder': '当前为演示数据，目录顺序仅在页面内生效。',
  'warn.demoMove': '当前为演示数据，移动仅在页面内生效。',
  'warn.demoExport': '当前是演示数据，导出的书签不是你的 Chrome 书签。',
  'warn.loadFailed': '读取书签失败，已显示演示内容。检查 Chrome 权限后重新打开新标签页即可。',
  'warn.dragFailed': '拖拽同步失败：{detail}',
  'warn.deleteFailed': '删除失败：{detail}',
  'error.chromePermission': '请检查 Chrome 书签权限。',
  'error.createEmpty': '名称不能为空。',
  'error.createFailed': '新建目录失败。',
  'error.renameFailed': '重命名失败。',
  'error.exportFailed': '导出备份失败。',
  'error.bgNeed': '请先选择或上传一张背景。',
  'error.bgSave': '背景设置保存失败。',
  'error.bgType': '请选择图片或 MP4 视频文件。',
  'error.bgRead': '读取图片失败。',
  'error.wrongPassword': '密码不正确。',
  'error.wrongCurrent': '当前密码不正确。',
  'error.passwordShort': '新密码至少需要 4 位。',
  'error.passwordFailed': '密码操作失败。',
  'error.backup.badBookmarks': '书签数据格式无效，备份没有导出。',
  'error.backup.bgUnread': '本地背景还没有读出来，备份没有导出。',
  'error.backup.bgInvalid': '背景地址无效，备份没有导出。',
  'error.backup.bgWrite': '背景地址无法写入备份。请改用图片地址，或先清除背景后再导出。',
  'error.backup.accessBad': '目录密码数据格式无效，备份没有导出。',
  'error.backup.source': '无法确定备份来源，备份没有导出。',
  'error.backup.notFile': '这不是书签备份文件。',
  'error.backup.noSettings': '备份文件缺少本机设置，无法识别。',
  'error.backup.corrupt': '备份文件已损坏，无法读取。',
  'error.backup.version': '无法识别的备份版本。',
  'error.backup.readBg': '读取本地背景失败，备份没有导出。',
  'error.backup.noDownload': '当前环境无法下载文件。',
  'error.backup.readBookmarks': '读取书签失败，备份没有导出。',
  'error.backup.busy': '书签还在读取，请稍后再导出。',
  'error.backup.accessCorrupt': '目录密码数据已损坏，备份没有导出。',
  'error.tree.noId': '节点缺少 id',
  'error.tree.noParent': '找不到上级目录',
  'error.createFailedShort': '新建目录失败',
  'error.bg.videoSave': '本地视频保存失败，请重试或换一个视频文件。',
  'error.bg.videoGone': '视频资源已失效，请重新上传 MP4 文件。',
  'error.bg.imageSave': '本地图片保存失败，请重试或改用图片地址。',
  'error.bg.quota': '背景设置保存失败，存储空间不足。请改用图片地址或换一张更小的图片。',
  'error.access.badFormat': '目录密码数据格式无效。',
  'error.access.read': '读取目录密码失败：{detail}',
  'error.access.unsupported': '当前环境不支持安全密码存储。',
  'error.access.empty': '密码不能为空。',
  'error.access.none': '该目录没有设置访问密码。',
  'error.access.badData': '数据格式无效。'
}

const en = {
  'app.title': 'My bookmarks',
  'topbar.search': 'Search title or URL',
  'topbar.export': 'Export backup',
  'topbar.settings': 'Display',
  'topbar.toLight': 'Switch to light mode',
  'topbar.toDark': 'Switch to dark mode',
  'lang.toEn': 'Switch to English',
  'lang.toZh': 'Switch to Chinese',
  'nav.back': 'Back',
  'nav.tabs': 'Bookmark folders',
  'nav.tabTip': 'Drag to reorder. Drop a bookmark here to move it in.',
  'name.folder': 'Untitled folder',
  'name.bookmark': 'Untitled bookmark',
  'name.untitled': 'Untitled',
  'name.bar': 'Bookmarks bar',
  'tab.all': 'All bookmarks',
  'empty.none': 'No bookmarks',
  'empty.hint': 'Add some in the Chrome bookmark manager.',
  'empty.search': 'No matches',
  'empty.searchHint': 'Try another title or URL.',
  'recent.label': 'Recent',
  'module.open': 'Open folder {title}',
  'module.locked': 'This folder is locked',
  'module.unlock': 'Enter password',
  'module.count1': '{count} item',
  'module.count': '{count} items',
  'menu.newRoot': 'New folder',
  'menu.newFolder': 'New subfolder',
  'menu.renameFolder': 'Rename folder',
  'menu.renameBookmark': 'Rename bookmark',
  'menu.setPassword': 'Set password',
  'menu.changePassword': 'Change password',
  'menu.removePassword': 'Remove password',
  'menu.deleteFolder': 'Delete folder',
  'menu.deleteBookmark': 'Delete bookmark',
  'kind.folder': 'Folder',
  'kind.bookmark': 'Bookmark',
  'create.title': 'New folder',
  'create.in': 'Create in “{name}”',
  'create.action': 'Create',
  'action.cancel': 'Cancel',
  'action.save': 'Save',
  'action.closeNamed': 'Close {name}',
  'field.name': 'Name',
  'rename.titleFolder': 'Rename folder',
  'rename.titleBookmark': 'Rename bookmark',
  'delete.titleFolder': 'Delete folder',
  'delete.titleBookmark': 'Delete bookmark',
  'delete.labelFolder': 'Delete folder',
  'delete.labelBookmark': 'Delete bookmark',
  'delete.bodyFolder': 'This deletes the folder “{name}”.',
  'delete.bodyBookmark': 'This deletes the bookmark “{name}”.',
  'delete.children': 'Everything inside will be deleted too.',
  'delete.undo': 'This cannot be undone.',
  'delete.confirm': 'Delete',
  'access.titleUnlock': 'Folder password',
  'access.titleRemove': 'Remove folder password',
  'access.titleChange': 'Change folder password',
  'access.titleSet': 'Set folder password',
  'access.unlock': 'Unlock',
  'access.remove': 'Remove',
  'access.password': 'Password',
  'access.current': 'Current password',
  'access.new': 'New password',
  'access.confirm': 'Confirm new password',
  'access.mismatch': 'The two passwords don’t match.',
  'settings.title': 'Display',
  'settings.desc': 'Card size and fonts apply to every tab. Pick a preset wallpaper or upload a local image/video.',
  'settings.layout': 'Layout',
  'settings.cardSize': 'Card size',
  'settings.latin': 'Latin font',
  'settings.cjk': 'Chinese font',
  'settings.background': 'Background',
  'settings.enable': 'Use background',
  'settings.upload': 'Upload image or video',
  'settings.clear': 'Clear background',
  'settings.opacity': 'Card opacity',
  'settings.presets': 'Preset wallpapers',
  'settings.galleryLoading': 'Loading preset wallpapers…',
  'settings.galleryEmpty': 'No presets yet. You can still upload a local image or video.',
  'settings.galleryError': 'Couldn’t load presets. You can still upload a local image or video.',
  'settings.galleryRetry': 'Retry',
  'settings.videoTag': 'Video',
  'size.0': 'Tiny',
  'size.1': 'Small',
  'size.2': 'Medium',
  'size.3': 'Large',
  'font.latin.system': 'System',
  'font.latin.inter': 'Inter',
  'font.latin.roboto': 'Roboto',
  'font.latin.open-sans': 'Open Sans',
  'font.latin.lato': 'Lato',
  'font.latin.montserrat': 'Montserrat',
  'font.latin.poppins': 'Poppins',
  'font.latin.nunito-sans': 'Nunito Sans',
  'font.latin.source-sans-3': 'Source Sans 3',
  'font.latin.plex': 'IBM Plex Sans',
  'font.latin.geist': 'Geist',
  'font.latin.manrope': 'Manrope',
  'font.cjk.system': 'System',
  'font.cjk.noto': 'Noto Sans',
  'font.cjk.noto-serif': 'Noto Serif',
  'font.cjk.lxgw-wenkai': 'LXGW WenKai',
  'font.cjk.zcool-xiaowei': 'ZCOOL XiaoWei',
  'font.cjk.zcool-qingke': 'ZCOOL QingKe',
  'font.cjk.ma-shan-zheng': 'Ma Shan Zheng',
  'font.cjk.long-cang': 'Long Cang',
  'font.cjk.liu-jian-mao-cao': 'Liu Jian Mao Cao',
  'font.cjk.misans': 'MiSans',
  'font.cjk.harmony': 'HarmonyOS',
  'warn.demoDelete': 'Demo data only. Delete stays on this page.',
  'warn.demoCreate': 'Demo data only. The new folder stays on this page.',
  'warn.demoRename': 'Demo data only. Rename stays on this page.',
  'warn.demoOrder': 'Demo data only. Folder order stays on this page.',
  'warn.demoMove': 'Demo data only. The move stays on this page.',
  'warn.demoExport': 'This is demo data. The export is not your Chrome bookmarks.',
  'warn.loadFailed': 'Couldn’t read bookmarks, so demo content is showing. Check the Chrome permission and open a new tab.',
  'warn.dragFailed': 'Couldn’t sync the move: {detail}',
  'warn.deleteFailed': 'Couldn’t delete: {detail}',
  'error.chromePermission': 'Check the Chrome bookmarks permission.',
  'error.createEmpty': 'Name is required.',
  'error.createFailed': 'Couldn’t create the folder.',
  'error.renameFailed': 'Couldn’t rename.',
  'error.exportFailed': 'Couldn’t export the backup.',
  'error.bgNeed': 'Choose or upload a background first.',
  'error.bgSave': 'Couldn’t save display settings.',
  'error.bgType': 'Choose an image or an MP4 video.',
  'error.bgRead': 'Couldn’t read the image.',
  'error.wrongPassword': 'Wrong password.',
  'error.wrongCurrent': 'Current password is wrong.',
  'error.passwordShort': 'New password needs at least 4 characters.',
  'error.passwordFailed': 'Couldn’t update the password.',
  'error.backup.badBookmarks': 'Bookmark data is invalid. Nothing was exported.',
  'error.backup.bgUnread': 'The local background isn’t loaded yet. Nothing was exported.',
  'error.backup.bgInvalid': 'The background address is invalid. Nothing was exported.',
  'error.backup.bgWrite': 'The background address can’t be written into the backup. Use an image URL, or clear the background first.',
  'error.backup.accessBad': 'Folder password data is invalid. Nothing was exported.',
  'error.backup.source': 'Couldn’t tell where this backup comes from. Nothing was exported.',
  'error.backup.notFile': 'This is not a bookmark backup.',
  'error.backup.noSettings': 'This backup has no local settings, so it can’t be recognized.',
  'error.backup.corrupt': 'This backup is damaged and can’t be read.',
  'error.backup.version': 'Unrecognized backup version.',
  'error.backup.readBg': 'Couldn’t read the local background. Nothing was exported.',
  'error.backup.noDownload': 'This environment can’t download files.',
  'error.backup.readBookmarks': 'Couldn’t read bookmarks. Nothing was exported.',
  'error.backup.busy': 'Bookmarks are still loading. Export again in a moment.',
  'error.backup.accessCorrupt': 'Folder password data is damaged. Nothing was exported.',
  'error.tree.noId': 'Node is missing an id',
  'error.tree.noParent': 'Parent folder not found',
  'error.createFailedShort': 'Couldn’t create the folder',
  'error.bg.videoSave': 'Couldn’t save the local video. Try again or use another file.',
  'error.bg.videoGone': 'The video is gone. Upload the MP4 again.',
  'error.bg.imageSave': 'Couldn’t save the local image. Try again or use an image URL.',
  'error.bg.quota': 'Couldn’t save display settings. Storage is full. Use an image URL or a smaller image.',
  'error.access.badFormat': 'Folder password data is invalid.',
  'error.access.read': 'Couldn’t read the folder password: {detail}',
  'error.access.unsupported': 'This environment can’t store passwords securely.',
  'error.access.empty': 'Password is required.',
  'error.access.none': 'This folder has no password.',
  'error.access.badData': 'Invalid data.'
}

export const messages = { zh, en }

const FOLDER_READ_PREFIX = '读取目录密码失败：'

const errorAlias = Object.fromEntries(
  Object.entries(zh)
    .filter(([key]) => key.startsWith('error.') || key.startsWith('warn.'))
    .map(([key, value]) => [value, key])
)

export const locale = ref('zh')

export function matchLocale(languages) {
  const list = Array.isArray(languages) ? languages : [languages || '']
  for (const lang of list) {
    const code = String(lang || '').toLowerCase()
    if (code.startsWith('zh')) return 'zh'
    if (code.startsWith('en')) return 'en'
  }
  return 'en'
}

export function resolveInitialLocale(storage, languages) {
  const saved = storage?.getItem?.(LOCALE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return matchLocale(languages)
}

const htmlLang = (value) => (value === 'zh' ? 'zh-CN' : 'en')

export function applyLocale(next) {
  locale.value = next === 'en' ? 'en' : 'zh'
  if (typeof document !== 'undefined') {
    document.documentElement.lang = htmlLang(locale.value)
  }
}

export function initLocale() {
  const languages = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : ['en']
  const storage = typeof localStorage !== 'undefined' ? localStorage : null
  applyLocale(resolveInitialLocale(storage, languages))
}

export function setLocale(next) {
  if (next !== 'zh' && next !== 'en') {
    throw new Error(`unsupported locale: ${next}`)
  }
  applyLocale(next)
  localStorage.setItem(LOCALE_KEY, next)
}

export function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

export function t(key, params) {
  if (key == null || key === '') return ''
  const raw = String(key)
  const table = messages[locale.value] || en
  const resolved = table[raw] ?? en[raw] ?? zh[raw] ?? raw
  if (!params) return resolved
  return resolved.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? '' : String(params[name])))
}

export function text(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object') {
    const params = {}
    for (const [name, param] of Object.entries(value.params || {})) {
      params[name] = typeof param === 'string' ? text(param) : (param ?? '')
    }
    return t(value.key, params)
  }
  if (value.startsWith(FOLDER_READ_PREFIX)) {
    return t('error.access.read', { detail: text(value.slice(FOLDER_READ_PREFIX.length)) })
  }
  return t(errorAlias[value] || value)
}

export function fontLabel(group, preset) {
  const key = `font.${group}.${preset.id}`
  const value = t(key)
  return value === key ? preset.label : value
}
