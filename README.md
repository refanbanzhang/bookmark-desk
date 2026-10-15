# Chrome 书签启动页

基于 Vue 3 + Vite，覆盖 Chrome 新标签页并按目录展示书签的轻量扩展。

## 特性
- 利用 `chrome.bookmarks` API 读取书签树，按文件夹/书签区分展示。
- 顶层是 12 列马赛克：目录卡片占 4 列，散落书签排成小磁贴（图标在上、标题两行、域名在下）。
- 目录 Tab 切换，卡片内书签按两列磁贴排布，子目录仍占整行；递归渲染并展示域名信息。
- 书签行使用 Chrome 自带 favicon 缓存中的网站图标（向 `/_favicon` 请求 64px 原图后缩放到 26/34px，读取失败时回退为字母占位）。
- 设置背景图后，目录 Tab 与空态会自动落到卡片面上，保证文字在图片上依然清晰。
- 拖拽语义按拖动对象区分：拖书签可调顺序，拖到目录卡片标题栏/目录行/顶部 Tab 即移入该目录；拖目录卡片或顶部 Tab 则在同级之间换位排序。
- 右键菜单支持重命名与删除（文件夹删除走二次确认）。
- 浅色/深色主题，跟随系统偏好并记忆手动选择。
- 支持配置页面背景图，可用图片 URL 或本地上传（本地图片存入 IndexedDB），并可调节背景透明度、模糊与卡片不透明度，配置持久化到本地。
- 视觉语言由设计令牌驱动（`src/styles/tokens.css`），动效只用轻量 CSS 过渡，并遵循 `prefers-reduced-motion`。
- 可用作 Chrome 新标签页（`chrome_url_overrides.newtab` 指向构建产物）。
- 在不支持 Chrome API 的环境下自动回退到演示数据，方便调试。
- 不显示成功提示：拖拽、重命名、删除成功后界面本身就是反馈；只有读取失败、同步出错或处于演示数据时才出现一行告警条。

## 本地开发
```bash
npm install
npm run dev
```
在浏览器输入 `http://localhost:5173` 查看 Vue 页面，注意 `chrome.bookmarks` 在本地并不可用，界面会使用示例数据。

## 测试与打包
```bash
npm test          # node --test，覆盖书签树、拖拽索引、背景设置等纯逻辑
npm run build     # 产物在 dist/
npm run icons     # 由 public/icons/icon.svg 重新生成 48/128 PNG（需要 rsvg-convert）
```
构建输出目录 `dist/` 可直接作为 Chrome 扩展的 unpacked folder 加载（需确保浏览器版本支持 Manifest V3）。

## Chrome 扩展配置
- `public/manifest.json` 里声明了 `chrome_url_overrides.newtab`，指向 `index.html`。
- 授权 `bookmarks` 权限以访问用户书签，`favicon` 权限用于读取 Chrome 已缓存的网站图标（不会发起额外网络请求）。
- 扩展图标源文件是 `public/icons/icon.svg`（深色圆角方块 + 奶白/品牌绿书签），`npm run icons` 生成 `bookmark-48.png` / `bookmark-128.png`；同一份 SVG 也作为页面 favicon。构建时 `public/` 原样拷贝。
- 版本号同时写在 `public/manifest.json` 与 `package.json`，改动界面行为后记得一起提升。

## 目录结构
```
├── public/manifest.json          # 扩展声明文件与图标
├── src/
│   ├── App.vue                   # 组装层：接入 composables，编排页面骨架与全局快捷键
│   ├── main.js                   # 入口，引入 src/styles/index.css
│   ├── constants.js              # localStorage key、根书签 Tab 标识
│   ├── styles/
│   │   ├── tokens.css            # 设计令牌（浅色 + 深色）
│   │   ├── base.css              # 重置、排版、焦点环、无障碍与减动效
│   │   └── components.css        # 组件样式（无装饰性阴影）
│   ├── composables/              # 逻辑层，模块级单例状态，替代逐层 props/emit
│   │   ├── useChromeBookmarks.js # Chrome API 封装与打开链接
│   │   ├── useBookmarkTree.js    # 书签树读取与状态
│   │   ├── useBookmarkTabs.js    # 目录 Tab 派生、选中项持久化
│   │   ├── useBookmarkActions.js # 重命名 / 删除
│   │   ├── useBookmarkDrag.js    # 拖拽会话、投放目标与移动同步
│   │   ├── useContextMenu.js     # 右键菜单定位与开关
│   │   ├── useBackgroundImage.js # 背景设置与本地图片存储
│   │   └── useTheme.js           # 主题读取与切换
│   ├── components/               # 展示层
│   │   ├── AppTopbar.vue         # 书签标识与背景 / 主题入口
│   │   ├── FolderTabs.vue        # 目录 Tab：书签移入目标，也可拖动换位
│   │   ├── BookmarkBoard.vue     # 骨架屏 / 磁贴网格 / 空状态
│   │   ├── BookmarkTree.vue      # 递归可拖拽列表（顶层即马赛克网格）
│   │   ├── BookmarkModule.vue    # 目录卡片
│   │   ├── BookmarkRow.vue       # 书签行 / 子目录行
│   │   ├── ContextMenu.vue       # 右键菜单
│   │   ├── BaseModal.vue         # 弹窗骨架
│   │   ├── RenameDialog.vue      # 重命名
│   │   ├── DeleteConfirmDialog.vue # 删除确认
│   │   └── BackgroundSettingsDialog.vue # 背景设置
│   ├── utils/                    # 纯函数：书签树变换、拖拽索引、favicon 地址、背景设置归一化
│   └── mock/                     # 无 Chrome API 时的演示数据
├── test/                         # node:test 单元测试
└── docs/design/                  # 重构设计稿（令牌、界面、组件拆分方案）
```

## 加载扩展
1. Chrome 扩展管理页面（`chrome://extensions/`）。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `dist/` 目录。
4. 打开一个新标签页，新页面即为书签聚合页。
