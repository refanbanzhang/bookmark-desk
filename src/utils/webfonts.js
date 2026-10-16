import { CJK_FONT_PRESETS } from './backgroundSettings'

/**
 * 按需注入中文字体的样式表。MiSans 与鸿蒙的 CSS 各 130KB 以上（压缩前），
 * 写死在 index.html 里等于每个新标签页都白解析一遍；只在选中该档位、
 * 或打开设置面板要预览各档字形时才注入。失败（离线）就静默回退到系统字族。
 */
export const ensureWebfonts = (fontIds, doc = globalThis.document) => {
  if (!doc?.head) {
    return
  }

  for (const fontId of fontIds) {
    const preset = CJK_FONT_PRESETS.find((item) => item.id === fontId)

    for (const href of preset?.hrefs || []) {
      if (doc.querySelector(`link[data-webfont="${href}"]`)) {
        continue
      }

      const link = doc.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.webfont = href
      doc.head.appendChild(link)
    }
  }
}
