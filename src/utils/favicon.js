/**
 * 网站图标：优先读取 Chrome 自带 favicon 缓存（需 manifest 声明 "favicon" 权限），
 * 非扩展环境（本地 dev / 演示数据）返回空串，由界面回退到字母占位。
 *
 * 64 是配着磁贴的 36px 图标框选的：两倍屏要 68 个设备像素，取 64 最接近。
 * 要更大的位图没有意义——站点 favicon 多半只有 16/32px，Chrome 只是把原图放大，
 * 界面再放大一次就糊了，所以放大尺寸要同步改这个值和磁贴的 --row-icon。
 */
const FAVICON_SIZE = 64

const isExtensionContext = () => {
  if (typeof chrome === 'undefined') {
    return false
  }
  return Boolean(chrome?.runtime?.getURL && chrome?.runtime?.id)
}

export const getFaviconUrl = (url) => {
  if (!url || !isExtensionContext()) {
    return ''
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return ''
    }
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(parsed.href)}&size=${FAVICON_SIZE}`
    )
  } catch {
    return ''
  }
}
