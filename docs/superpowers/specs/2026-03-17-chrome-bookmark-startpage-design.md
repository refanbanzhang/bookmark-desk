# Bookmark Desk 设计

## 目标
在 Chrome 中提供一份启动页，取代默认的新标签页并通过 `chrome.bookmarks` API 读取完整书签树，用目录分组方式展示，帮助用户快速定位书签。

## 核心需求
1. 使用 `chrome.bookmarks.getTree` 读取整个书签结构，并根据文件夹层级递归渲染（保持层级可展开）。
2. 支持离线/开发环境，若 Chrome API 不可用则回退到演示数据，同时在 UI 中提示当前是在演示数据模式。
3. 适配 Chrome 新标签页：通过 Manifest V3 的 `chrome_url_overrides.newtab` 覆盖 `index.html`，并声明 `bookmarks` 权限。
4. UI 以中文为主，做到图层分明、导航直观，包含目录/书签统计和说明文字。

## 架构 & 数据流
- `src/main.js` 挂载 `App.vue` 并引入统一样式。
- `App.vue`:
  - 在 `onMounted` 期间调用 `loadBookmarks`，优先使用 `chrome.bookmarks.getTree` 获取树结构。
  - 当对 `chrome.bookmarks` 无法访问时，将 `warning` 文案置入并设定 `bookmarkTree` 为 `fallbackTree`（包含书签栏、其他书签、快速访问三个示例分组）。
  - `summary` 计算函数递归统计目录/书签数量，用于展示“目录 x 个、书签 y 个”的 chip。
  - 模板包含 hero 文案、统计 chip、状态、警告提示、`BookmarkGroup` 递归组件以及页脚说明。
- `BookmarkGroup` 组件:
  - 接收 `nodes` 数组和 `depth`，`hasChildren` 判断是否为目录。
  - 以嵌套 `<ul>` 递归渲染子节点；每行显示名称、圆点标识、元信息（目录/域名）。
  - 通过 CSS 样式给目录行加背景，hover 和阴影效果增强层级感。
- 资源
  - `public/manifest.json` 定义 Manifest V3 配置与 `chrome_url_overrides`，引用 `public/icons/bookmark-*.png` 生成扩展图标。
  - `public/icons` 中的 PNG 由本地脚本生成，确保尺寸为 48px/128px 以符合 Chrome 要求。

## UI/交互设计
- 背景采用渐变光晕，主容器带圆角与阴影，营造「卡片 + 氛围」的桌面感觉。
- Hero 部分包含醒目的标题、副标题、统计 chip，增加启动页属性。
- 内容区分为状态提示、警告（如 API 不可用）、书签树和提示脚注。
- 书签项包含圆点、标题和 meta 文案，目录项用渐变蓝背景区分，hover 时轻微上浮。
- 响应式：窄屏下调整 padding、chip 宽度和 `BookmarkGroup` 布局。

## 构建 & 交付
- 使用 Vite 默认构建命令 `npm run build`，输出包含 `index.html`、静态资源、`manifest.json` 和图标，整个 `dist/` 可作为 unpacked extension 直接加载。
- README 指南中记录开发/构建/加载流程，帮助 QA 快速验证新标签页效果。

## 后续可选提升
- 增加书签搜索/筛选。
- 支持收藏夹跳转、拖动排序、目录折叠/展开状态持久化。
- 同步书签更新事件（订阅 `chrome.bookmarks.onChanged`）以保持页面实时性。
