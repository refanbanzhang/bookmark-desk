<p align="center">
  <img src="public/icons/bookmark-128.png" width="88" height="88" alt="Bookmark Desk logo" />
</p>

# Bookmark Desk

基于 Vue 3 + Vite，覆盖 Chrome 新标签页并按目录展示书签的轻量扩展。

## 特性
- 利用 `chrome.bookmarks` API 读取书签树，按文件夹/书签区分展示。
- 顶层一格一卡：目录卡与散落书签卡同宽同高，列数与格子尺寸一起由「卡片尺寸」档位决定，窄屏只压低列数上限、不越过用户选的档位。
- 卡片尺寸四档（`CARD_SIZE_PRESETS`，索引存在显示设置里）：特小 6 列 / 格子 140px、小 5 列 / 156px、标准 4 列 / 190px（默认）、大 3 列 / 216px；一档同时改 `--cell-cols`、`--cell-h`、`--cell-h-tiles`、`--cell-row-h`，拖动滑杆即时预览。
- 磁贴图标固定 36px，不随卡片尺寸档位缩放：站点 favicon 多半只有 16/32px，图标框再大字就更糊。
- 格子高度取 `--cell-h`（要容纳目录卡的三行子项）；若某个标签页顶层全是散落书签、没有目录卡，则整屏改用 `--cell-h-tiles`，避免磁贴被撑出大片空白。
- 书签卡：图标在上（36px）+ 两行标题 + 域名，内容垂直居中；目录卡：卡头 + 虚线分隔 + 单列紧凑子项，超出格高时在卡内滚动。
- 目录 Tab 切换，可拖动换位；卡片内递归渲染子目录与书签。
- 书签行使用 Chrome 自带 favicon 缓存中的网站图标（向 `/_favicon` 请求 64px 原图后缩放到卡内 22px / 磁贴 36px，读取失败时回退为字母占位）。
- 设置背景图后，目录 Tab 与空态会自动落到卡片面上，保证文字在图片上依然清晰。
- 拖拽语义按拖动对象区分：拖书签可调顺序，拖到目录卡片标题栏/目录行/顶部 Tab 即移入该目录；拖目录卡片或顶部 Tab 则在同级之间换位排序。
- 右键菜单支持重命名与删除（文件夹删除走二次确认）。目录上可新建子目录；顶栏「新建目录」把文件夹建在当前所在目录，并写回 Chrome 书签。
- 顶栏搜索按标题和地址模糊匹配整棵书签树：忽略大小写、协议和 `www`，多个词都要命中。未解锁的加密目录只匹配目录名，不露出里面的书签。
- 打开过的书签会出现在「最近访问」，只存在本机，不进 Chrome 同步。加密目录里的书签在解锁前不会出现在这里。
- 顶栏「导出备份」一次下载一个 HTML 文件。正文是 Netscape 书签（书签栏、其他书签、移动设备书签都在里面，书签栏带 `PERSONAL_TOOLBAR_FOLDER`，Chrome 书签管理器可直接导入）。文件末尾的注释里是本机显示设置、本地背景图或视频，以及目录密码的盐和哈希。文件只落在你点保存的位置，扩展不上传。没有 Chrome 书签 API 时导出的是演示数据，文件名带 `demo`，页面会提示这不是你的书签。
- 浅色/深色主题，跟随系统偏好并记忆手动选择。手动选择过的主题会经 `chrome.storage.sync` 跟随 Chrome 账号。
- 「显示设置」对话框（原「背景设置」）里可调卡片尺寸、背景图（URL 或本地上传，本地图存 IndexedDB）、背景透明度、磨砂与卡片不透明度。卡片尺寸、字体、不透明度、圆角、背景开关与位置，以及 http/https 背景图地址会跟着 Chrome 账号同步；本地上传的图片和视频、目录密码、当前目录只留在本机。「清除背景」只清图片，不会把卡片尺寸一起重置。
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
npm test          # node --test，覆盖书签树、搜索、最近访问、备份、拖拽索引、背景设置等纯逻辑
npm run build     # 产物在 dist/
npm run release   # = build + 打包成 release/bookmark-desk-<version>.zip，供商店上传
npm run zip       # 只打包现有 dist/，不重新构建
npm run shots     # 重新生成商店截图到 docs/store/screenshots/（先 build）
npm run icons     # 由 public/icons/icon.svg 重新生成 16/32/48/128 PNG（需要 rsvg-convert）
```
构建输出目录 `dist/` 可直接作为 Chrome 扩展的 unpacked folder 加载（需确保浏览器版本支持 Manifest V3）。
`release/` 下的 zip 是 Chrome 应用商店的上传包：`manifest.json` 位于压缩包根目录、不含外层文件夹。

## 发布到 Chrome 应用商店
提审材料（商店文案、权限理由、隐私政策页模板、截图）在 `docs/store/`，流程见 `docs/store/listing.md`。
要点：注册开发者账号需一次性 $5；每次上传的 `version` 必须高于商店已发布版本，改界面时记得把
`public/manifest.json` 与 `package.json` 的版本号一起提升。

## Chrome 扩展配置
- `public/manifest.json` 里声明了 `chrome_url_overrides.newtab`，指向 `index.html`。
- 授权 `bookmarks` 权限以访问用户书签，`favicon` 权限用于读取 Chrome 已缓存的网站图标（不会发起额外网络请求）。
- 扩展图标源文件是 `public/icons/icon.svg`（品牌绿书签带 + 奶白 2×2 桌面格子，图形铺满画布、无底板），`npm run icons` 生成 16/32/48/128 PNG，同一份 SVG 也作为页面 favicon。构建时 `public/` 原样拷贝。
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
│   │   ├── useBookmarkActions.js # 新建目录 / 重命名 / 删除
│   │   ├── useBookmarkSearch.js  # 标题与地址的模糊搜索
│   │   ├── useRecentVisits.js    # 本机最近访问
│   │   ├── useBookmarkDrag.js    # 拖拽会话、投放目标与移动同步
│   │   ├── useContextMenu.js     # 右键菜单定位与开关
│   │   ├── useBackgroundImage.js # 背景设置与本地图片存储
│   │   ├── useTheme.js           # 主题读取与切换
│   │   └── useBackup.js          # 一键导出书签与本机设置
│   ├── components/               # 展示层
│   │   ├── AppTopbar.vue         # 搜索、新建目录、导出备份、背景 / 主题入口
│   │   ├── RecentStrip.vue       # 最近访问
│   │   ├── CreateFolderDialog.vue # 新建目录
│   │   ├── FolderTabs.vue        # 目录 Tab：书签移入目标，也可拖动换位
│   │   ├── BookmarkBoard.vue     # 骨架屏 / 一格一卡网格 / 空状态
│   │   ├── BookmarkTree.vue      # 递归可拖拽列表（顶层即一格一卡）
│   │   ├── BookmarkModule.vue    # 目录卡片
│   │   ├── BookmarkRow.vue       # 书签行 / 子目录行
│   │   ├── ContextMenu.vue       # 右键菜单
│   │   ├── BaseModal.vue         # 弹窗骨架
│   │   ├── RenameDialog.vue      # 重命名
│   │   ├── DeleteConfirmDialog.vue # 删除确认
│   │   └── BackgroundSettingsDialog.vue # 背景设置
│   ├── utils/                    # 纯函数：书签树变换、拖拽索引、favicon 地址、背景设置归一化、备份文件
│   └── mock/                     # 无 Chrome API 时的演示数据
├── test/                         # node:test 单元测试
└── docs/design/                  # 重构设计稿（令牌、界面、组件拆分方案）
```

## 加载扩展
1. Chrome 扩展管理页面（`chrome://extensions/`）。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `dist/` 目录。
4. 打开一个新标签页，新页面即为书签聚合页。
