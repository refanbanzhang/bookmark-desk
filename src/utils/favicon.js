/**
 * 网站图标：优先读取 Chrome 自带 favicon 缓存（需 manifest 声明 "favicon" 权限），
 * 非扩展环境（本地 dev / 演示数据）返回空串，由界面回退到字母占位。
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
