# Chrome 应用商店提审材料

直接复制粘贴用。`[方括号]` 是需要你替换的内容。

当前构建版本：`1.2.25`
当前上传包：`release/bookmark-desk-1.2.25.zip`

提交前必须补齐两项：隐私政策公开 URL、对外联系邮箱。不要把下面的占位符原样提交。

---

## 一、账号（一次性）

- 地址：`chrome.google.com/webstore/devconsole`
- 费用：一次性 **$5** 注册费（唯一强制花费）
- 前置：Google 账号开启两步验证；否则无法发布
- 需完成身份验证
- 因欧盟 DSA 需声明 **trader / non-trader**：纯个人业余发布选 non-trader（商店不展示联系方式）；有商业主体选 trader

## 二、打包

```bash
npm run release    # = vite build + 打包成 release/bookmark-desk-<version>.zip
npm run zip        # 只打包现有 dist/，不重新构建
```

产物规格已核对：`manifest.json` 在压缩包根目录、无外层文件夹、无 `.DS_Store`、约 66 KB。

**版本号铁律**：首次上传后拿到 extension ID，之后每次更新 `version` 必须严格大于商店已发布版本，否则上传直接被拒。版本号写在 `public/manifest.json` 与 `package.json` 两处，必须保持一致。

## 三、商品详情

### 基本信息

| 字段 | 值 |
|---|---|
| 类别 | 生产力工具（Productivity） |
| 语言 | 中文（简体） |
| 名称 | Bookmark Desk |
| 图标 | `public/icons/bookmark-128.png`（128x128） |
| 发布范围 | 公开、免费、所有地区 |

### 简短说明（官网摘要，上限 132 字符）

```
把 Chrome 书签按目录铺成新标签页：一格一卡，拖拽整理，可选预设或本地背景。
```

### 详细说明

```
Bookmark Desk 把 Chrome 的新标签页换成你自己的书签台：不再显示空白页或导航站，
打开新标签即见常用站点。

主要功能
· 按目录展示：书签树里的每个文件夹就是一张卡片，卡片内可直接打开其中的书签与子目录
· 一格一卡：顶层目录卡与散落书签卡同宽同高，排布整齐；卡片尺寸提供四档档位可调
· 目录 Tab：文件夹在顶部成 Tab，可拖动换位；把书签拖到 Tab 或目录卡上即可移入
· 拖动整理：拖书签调顺序、拖目录换位、拖到文件夹即移入，调整立刻同步回 Chrome 书签
· 右键菜单：直接重命名或删除书签与文件夹（删除文件夹有二次确认）
· 背景与主题：默认提供公开预设壁纸图库（图片），也可上传本地图片或 MP4；卡片不透明度可调；浅色/深色跟随系统
· 字体可选：多种西文与中文字体，选择会持久化
· 图标本地取：网站图标读 Chrome 本地缓存，不向第三方图标服务发起请求
· 一键导出备份：下载一个 HTML 文件，书签可被 Chrome 导入；本机显示设置、本地背景和目录密码哈希附在同一文件里，只保存在你的电脑上

核心逻辑打包在扩展内，不收集、不上传书签和设置。预设壁纸列表读取公开 cdn-images 仓库的
wallpapers 目录（api.github.com）。选中一张图片后，文件会下载到本机，之后从本机打开，不再每次重新请求；
字体样式会从 Google Fonts 加载；选择 MiSans 或鸿蒙字体时，还会按需从 jsDelivr 加载字体样式。
网络不可用时预设图库显示失败提示，仍可上传本地背景；已经下载过的壁纸不受影响，字体回退到系统字体。
```

### 英文（可选，填了会给非中文语言环境展示）

```
Name: Bookmark Desk
Summary: Turn Chrome's new tab into a tidy bookmark grid—folders as cards, drag to organize, pick a preset or local wallpaper.
```

详细说明（英文）：

```
Bookmark Desk replaces Chrome's new tab with your own bookmark desk: open a tab and see the sites you use most, arranged by folder.

Key features
· Folder cards: each bookmark folder becomes a card you can open into
· Even grid: top-level folders and loose bookmarks share the same card size (four size presets)
· Folder tabs: drag tabs to reorder; drop a bookmark onto a tab or folder card to move it
· Drag to organize: reorder bookmarks, move folders, drop into folders—changes sync back to Chrome bookmarks
· Context menu: rename or delete bookmarks and folders (folder delete asks for confirmation)
· Background & theme: preset wallpaper gallery lists the public cdn-images wallpapers folder (images). The one you pick is downloaded to this computer and then opened locally; or upload a local image/MP4. Card opacity is adjustable; light/dark follows the system
· Fonts: several Latin and Chinese fonts, preferences persist
· Local favicons: icons come from Chrome's local cache—no third-party icon service
· One-click export: download an HTML backup Chrome can import; display settings, local background, and folder password hashes stay on your computer

Core logic ships inside the extension. Bookmarks and settings are not collected or uploaded. The preset wallpaper list is the public refanbanzhang/cdn-images wallpapers folder, read from api.github.com. The selected image is downloaded once and kept on this computer; later visits open that local copy. Font styles may load from Google Fonts (and MiSans / HarmonyOS fonts from jsDelivr when selected). If the network is down, the gallery shows an error and you can still upload a local background; a wallpaper already downloaded keeps working, and fonts fall back to system fonts.
```

## 四、隐私权规范（逐项照填）

### 单一目的说明

```
在新标签页按目录层级展示用户本地的 Chrome 书签，并允许用户对书签与文件夹做重命名、
删除和拖动整理。
```

### 权限理由

| 权限 | 理由（直接粘贴） |
|---|---|
| `bookmarks` | 读取用户的书签树，用于在新标签页渲染目录卡片与书签卡片；仅在用户主动重命名、删除或拖动整理时写回书签数据。不读取、不上传任何其他浏览数据。 |
| `favicon` | 读取 Chrome 本地已缓存的网站图标，用于展示书签卡片上的站点图标。图标取自本机缓存，不会向任何第三方服务器发起请求。 |
| `storage` | 通过 Chrome 同步在同一账号的设备之间同步显示偏好：主题、卡片尺寸、字体、不透明度、圆角，以及背景开关、位置、缩放、平铺和 http/https 背景图地址（含用户选中的预设壁纸地址）。本地上传的图片和视频、已经下载到本机的预设壁纸文件、目录密码、当前目录不会同步。 |
| `unlimitedStorage` | 选中的预设图片会整份保存到本机 IndexedDB，本地上传的视频可能超过扩展的默认存储配额。该权限只放宽本机存储上限，不读取、不上传任何数据。 |
| 主机权限 `api.github.com` | 打开显示设置时，读取公开仓库 `refanbanzhang/cdn-images` 的 `wallpapers` 目录文件名，用来生成预设壁纸列表。不读取私有仓库，不携带书签或本机设置。 |
| 主机权限 `cdn.jsdelivr.net` | 打开显示设置时加载预设壁纸预览；用户选中一张图片时把它下载到本机。已下载的文件之后从本机读取。并按需加载 MiSans / 鸿蒙字体样式。这些请求不携带书签或本机设置。用户仍可只使用本地上传。 |
| 主机权限 `raw.githubusercontent.com` | 当 GitHub 目录接口不可用时，回退读取同一公开仓库的 `wallpapers/index.json`。不读取任何私有仓库或用户数据。 |

### 数据使用

| 问题 | 选择 |
|---|---|
| 是否收集用户数据 | 否（不上传、不共享、不出售） |
| 书签数据 | 仅在本机内存中读取用于渲染。用户点击「导出备份」时，书签与本机设置下载为一个本地 HTML 文件，不上传。 |
| 设置与背景图 | 显示偏好经 Chrome 同步跟随登录账号；选中的预设壁纸只同步其公开 http/https 地址。壁纸文件下载到本机 IndexedDB，本地上传的图片和视频也只存在本机。目录密码只存在本机。不上传书签数据。 |
| 网络请求 | 核心功能不依赖网络。打开显示设置时会从 jsDelivr（失败则回退 GitHub raw）读取公开预设壁纸目录。选中一张预设图片时下载一次并存入本机，之后从本机读取。页面还会加载 Google Fonts 字体样式，选择 MiSans 或鸿蒙字体时会按需加载 jsDelivr 字体样式。用户仍可上传本地图片/MP4，不依赖该目录。用户主动打开书签时，浏览器会导航到该书签地址。 |
| 是否使用远程代码 | 否，全部逻辑打包在扩展内 |
| 隐私政策 URL | `[你的隐私政策页地址]`（模板见同目录 privacy-policy.html，必须部署成公开 HTTPS 地址） |

## 五、截图（1-5 张，严格 1280x800 或 640x400）

已生成四张 `1280x800`，按这个顺序传，第一张是列表主图：

1. `docs/store/screenshots/01-board-1280x800.png` — 主图：「常用工作台」铺成 18 格（两张目录卡 + 16 张书签卡），星空雪山背景透在卡片后面
2. `docs/store/screenshots/02-folders-1280x800.png` — 「开发」目录：三张目录卡（内含子项行）+ 九张散落书签卡混排，展示一格一卡与子目录
3. `docs/store/screenshots/03-settings-1280x800.png` — 显示设置：卡片尺寸、西文/中文字体、预设壁纸图库、启用背景图与「上传图片或视频」、卡片不透明度
4. `docs/store/screenshots/04-dark-1280x800.png` — 夜间主题 + 同一张背景图，卡片不透明度 82% 时背景仍透得出来

想上精选再加两张促销图：小图 440x280、大图 1400x560。

> 出图脚本：`npm run build && npm run shots`（`scripts/store-screenshots.mjs`）。
> 四张图都是在无头 Chrome 里对 `dist/` 构建产物渲染出来的：通过 CDP 在页面脚本之前注入 shim，
> 让页面走 `chrome.bookmarks.getTree` / `chrome.runtime.getURL` 的真实数据流；书签内容是一组
> 构造的示例站点，图标取各站点 favicon 内联为 data URI（等价于 Chrome 本地缓存里的同一张图），
> 不含任何个人书签。背景图是 `docs/store/wallpapers/night-mountain.jpg`，以 data URL 写进
> localStorage，等价于用户自己上传一张本地图后保存。
> 注意两点：`--load-extension` 在 Chrome 137+ 已失效，只能靠 CDP 注入 shim；改界面后先跑
> `npm run build` 再出图，否则截到的是旧产物。


## 六、提交

1. 先把 `docs/store/privacy-policy.html` 中的邮箱、日期和产品信息补齐，并部署成公开 HTTPS 页面
2. 控制台上传 `release/bookmark-desk-1.2.25.zip`，Chrome 自动读取 manifest 抓权限
3. 填完「商品详情」+「隐私权规范」才允许提交
4. **先选「仅限测试人员」发布**，用一个干净 Chrome 用户走一遍完整安装流程，确认无异常后再转公开
5. 首次提交不要勾「自动发布」，先人工看审查意见再放行
6. 审核通常 1-3 天，也可能到数周
7. 名称里不要出现 `Chrome`、`Google` 等商标词

上传前检查：

- [ ] 隐私政策 URL 可以在无登录状态下打开
- [ ] 联系邮箱是长期有效、能接收审查邮件的地址
- [ ] 开发者账号已完成两步验证和身份验证
- [ ] `version` 高于商店当前版本
- [ ] 先用干净 Chrome 安装测试包，确认新标签页、书签读取、拖拽、重命名、删除和背景设置
- [ ] 隐私权规范按本文件填写，不要填写“完全无网络请求”

## 七、后续更新循环

```bash
# 1. 改代码后同步提升两处版本号
#    public/manifest.json -> version
#    package.json         -> version
npm test
npm run release
# 2. 控制台上传 release/bookmark-desk-<version>.zip -> 提交审核
```
