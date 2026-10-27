#!/usr/bin/env node
/**
 * 商店截图生成器：对 dist/ 真实构建产物在无头 Chrome 里渲染并截图。
 *
 * 为什么不用 --load-extension：Chrome 137+ 已移除该启动参数，扩展环境只能靠
 * CDP 的 addScriptToEvaluateOnNewDocument 在页面脚本之前注入 chrome.* 的 shim。
 * 这里 shim 提供 chrome.bookmarks.getTree（构造的示例书签）与 chrome.runtime.getURL
 * （把 /_favicon 换成站点图标的 data URI），因此截图里既没有个人书签，也不发网络请求。
 *
 * 用法：
 *   npm run build && npm run shots
 * 产物：docs/store/screenshots/*-1280x800.png
 */
import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const OUT_DIR = path.join(ROOT, 'docs/store/screenshots')
const WALLPAPER = path.join(ROOT, 'docs/store/wallpapers/night-mountain.jpg')
const FAVICON_CACHE = path.join(tmpdir(), 'bookmark-desk-favicons.json')

const WIDTH = 1280
const HEIGHT = 800

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
].filter(Boolean)

/* ------------------------------------------------------------------ 示例数据 */

const site = (id, title, url) => ({ id, title, url })
const folder = (id, title, children) => ({ id, title, children })

const TREE = [
  folder('fx-workbench', '常用工作台', [
    folder('fx-design', '设计资源', [
      site('fx-figma', 'Figma', 'https://www.figma.com/'),
      site('fx-dribbble', 'Dribbble', 'https://dribbble.com/')
    ]),
    folder('fx-team', '团队协作', [
      site('fx-slack', 'Slack', 'https://slack.com/'),
      site('fx-notion', 'Notion', 'https://www.notion.so/')
    ]),
    site('fx-gmail', 'Gmail', 'https://mail.google.com/'),
    site('fx-calendar', 'Google Calendar', 'https://calendar.google.com/'),
    site('fx-miro', 'Miro', 'https://miro.com/'),
    site('fx-loom', 'Loom', 'https://www.loom.com/'),
    site('fx-perplexity', 'Perplexity', 'https://www.perplexity.ai/'),
    site('fx-youtube', 'YouTube', 'https://www.youtube.com/'),
    site('fx-hn', 'Hacker News', 'https://news.ycombinator.com/'),
    site('fx-ph', 'Product Hunt', 'https://www.producthunt.com/'),
    site('fx-so', 'Stack Overflow', 'https://stackoverflow.com/'),
    site('fx-figma-tile', 'Figma', 'https://www.figma.com/'),
    site('fx-notion-tile', 'Notion', 'https://www.notion.so/'),
    site('fx-vercel-tile', 'Vercel', 'https://vercel.com/'),
    site('fx-cf-tile', 'Cloudflare', 'https://www.cloudflare.com/'),
    site('fx-docker-tile', 'Docker', 'https://www.docker.com/'),
    site('fx-unsplash-tile', 'Unsplash', 'https://unsplash.com/'),
    site('fx-fonts-tile', 'Google Fonts', 'https://fonts.google.com/')
  ]),
  folder('fx-dev', '开发', [
    folder('fx-frontend', '前端', [
      site('fx-mdn', 'MDN Web Docs', 'https://developer.mozilla.org/'),
      site('fx-vue', 'Vue', 'https://vuejs.org/')
    ]),
    folder('fx-deploy', '后端与部署', [
      site('fx-docker', 'Docker', 'https://www.docker.com/'),
      site('fx-vercel', 'Vercel', 'https://vercel.com/')
    ]),
    folder('fx-tools', '工具与文档', [
      site('fx-caniuse', 'Can I use', 'https://caniuse.com/'),
      site('fx-devdocs', 'DevDocs', 'https://devdocs.io/')
    ]),
    site('fx-github', 'GitHub', 'https://github.com/'),
    site('fx-so2', 'Stack Overflow', 'https://stackoverflow.com/'),
    site('fx-codepen', 'CodePen', 'https://codepen.io/'),
    site('fx-npm', 'npm', 'https://www.npmjs.com/'),
    site('fx-vite', 'Vite', 'https://vitejs.dev/'),
    site('fx-node', 'Node.js', 'https://nodejs.org/'),
    site('fx-gitlab', 'GitLab', 'https://gitlab.com/'),
    site('fx-unpkg', 'UNPKG', 'https://unpkg.com/'),
    site('fx-cf', 'Cloudflare', 'https://www.cloudflare.com/')
  ]),
  folder('fx-design-tab', '设计与灵感', [
    site('fx-dribbble2', 'Dribbble', 'https://dribbble.com/'),
    site('fx-behance2', 'Behance', 'https://www.behance.net/'),
    site('fx-mobbin2', 'Mobbin', 'https://mobbin.com/'),
    site('fx-unsplash2', 'Unsplash', 'https://unsplash.com/'),
    site('fx-fonts2', 'Google Fonts', 'https://fonts.google.com/'),
    site('fx-figma2', 'Figma', 'https://www.figma.com/')
  ]),
  folder('fx-ai-tab', 'AI 与效率', [
    site('fx-openai', 'OpenAI', 'https://openai.com/'),
    site('fx-claude', 'Claude', 'https://claude.ai/'),
    site('fx-perplexity2', 'Perplexity', 'https://www.perplexity.ai/'),
    site('fx-hf', 'Hugging Face', 'https://huggingface.co/'),
    site('fx-zapier', 'Zapier', 'https://zapier.com/')
  ])
]

const collectUrls = (nodes, output = []) => {
  for (const node of nodes) {
    if (node.children) collectUrls(node.children, output)
    else if (node.url) output.push(node.url)
  }
  return output
}

/* ------------------------------------------------------------------ 图标获取 */

const fetchBytes = async (url, timeout = 8000) => {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    })
    if (!response.ok) return null
    const type = response.headers.get('content-type') || ''
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) return null
    if (/text\/html/i.test(type) && buffer.length < 4096) return null
    return { buffer, type }
  } catch {
    return null
  }
}

/** 依次尝试：站点自己的 favicon → DuckDuckGo 缓存 → Google s2。取到即用。 */
const fetchFavicon = async (pageUrl) => {
  const host = new URL(pageUrl).host
  const attempts = [
    `https://${host}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  ]

  for (const attempt of attempts) {
    const result = await fetchBytes(attempt)
    if (result && !/text\//i.test(result.type)) {
      return `data:${result.type || 'image/png'};base64,${result.buffer.toString('base64')}`
    }
  }
  return ''
}

const loadFavicons = async () => {
  const urls = [...new Set(collectUrls(TREE))]
  let cache = {}
  if (existsSync(FAVICON_CACHE)) {
    try {
      cache = JSON.parse(await readFile(FAVICON_CACHE, 'utf8'))
    } catch {
      cache = {}
    }
  }

  const missing = urls.filter((url) => !cache[url])
  if (missing.length) {
    process.stdout.write(`取站点图标 ${missing.length} 个…\n`)
    for (const url of missing) {
      cache[url] = await fetchFavicon(url)
      if (!cache[url]) process.stdout.write(`  ! 没取到 ${url}\n`)
    }
    await writeFile(FAVICON_CACHE, JSON.stringify(cache, null, 2))
  }

  return cache
}

/* ------------------------------------------------------------------ 静态服务 */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

const startServer = () =>
  new Promise((resolve) => {
    const server = createServer(async (request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      const requested = pathname === '/' ? '/index.html' : pathname
      const filePath = path.join(DIST, path.normalize(requested).replace(/^(\.\.[/\\])+/, ''))

      try {
        const body = await readFile(filePath)
        response.writeHead(200, {
          'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'cache-control': 'no-store'
        })
        response.end(body)
      } catch {
        response.writeHead(404).end('not found')
      }
    })

    server.listen(0, '127.0.0.1', () => resolve(server))
  })

/* ------------------------------------------------------------------ CDP 客户端 */

class Cdp {
  constructor(socket) {
    this.socket = socket
    this.nextId = 0
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`))
        else resolve(message.result)
      }
    })
  }

  static async connect(url) {
    const socket = new WebSocket(url)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', () => reject(new Error('CDP 连接失败')), { once: true })
    })
    return new Cdp(socket)
  }

  send(method, params = {}) {
    const id = ++this.nextId
    this.socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP 超时：${method}`))
      }, 20000)
    })
  }

  close() {
    this.socket.close()
  }
}

const waitFor = async (check, { timeout = 15000, interval = 120, label = '条件' } = {}) => {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error(`等待${label}超时`)
}

/* ------------------------------------------------------------------ 页面 shim */

const buildShim = ({ favicons, background, theme, tab }) => {
  const tree = JSON.stringify(TREE)
  const icons = JSON.stringify(favicons)

  return `(() => {
  const ICONS = ${icons};
  const TREE = ${tree};
  const baseChrome = window.chrome || {};
  const runtime = {
    id: 'bookmarkdeskdemoabcdefghijklmnop',
    getURL(target) {
      const text = String(target || '');
      const match = text.match(/pageUrl=([^&]+)/);
      const pageUrl = match ? decodeURIComponent(match[1]) : '';
      const host = (() => { try { return new URL(pageUrl).host } catch { return '' } })();
      return ICONS[pageUrl] || (host ? ICONS[host] : '') || '';
    }
  };
  const bookmarks = {
    getTree(callback) {
      setTimeout(() => callback([{ id: '0', title: '', children: [
        { id: '1', title: '书签栏', children: TREE }
      ] }]), 0);
    },
    update(id, changes, callback) { callback && callback({ id, ...changes }); },
    remove(id, callback) { callback && callback(); },
    removeTree(id, callback) { callback && callback(); },
    move(id, destination, callback) { callback && callback({ id, ...destination }); }
  };
  window.chrome = Object.assign({}, baseChrome, { runtime, bookmarks });

  try {
    localStorage.setItem('bookmark-background-settings', ${JSON.stringify(JSON.stringify(background))});
    localStorage.setItem('bookmark-theme', ${JSON.stringify(theme)});
    localStorage.setItem('bookmark-active-tab', ${JSON.stringify(tab)});
  } catch {}

  const style = document.createElement('style');
  style.textContent = '*{transition:none!important;animation:none!important;caret-color:transparent!important}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
})()`
}

/* ------------------------------------------------------------------ 截图定义 */

const buildShots = () => [
  {
    file: '01-board-1280x800.png',
    theme: 'light',
    tab: 'fx-workbench',
    cardOpacity: 0.84,
    cardSize: 0
  },
  {
    file: '02-folders-1280x800.png',
    theme: 'light',
    tab: 'fx-dev',
    cardOpacity: 0.84,
    cardSize: 0
  },
  {
    file: '03-settings-1280x800.png',
    theme: 'light',
    tab: 'fx-workbench',
    cardOpacity: 0.84,
    cardSize: 0,
    action: 'settings'
  },
  {
    file: '04-dark-1280x800.png',
    theme: 'dark',
    tab: 'fx-workbench',
    cardOpacity: 0.82,
    cardSize: 0
  }
]

/* ------------------------------------------------------------------ 主流程 */

const findChrome = () => {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('没找到 Chrome，可用 CHROME_PATH 指定')
  return found
}

const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20)
})

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true })
  const favicons = await loadFavicons()
  const wallpaper = (await readFile(WALLPAPER)).toString('base64')
  const background = {
    enabled: true,
    mediaType: 'image',
    imageUrl: `data:image/jpeg;base64,${wallpaper}`,
    imageStorage: '',
    cardOpacity: 0.84,
    cardSize: 0,
    latinFont: 'inter',
    cjkFont: 'noto',
    cardRadius: 12,
    tabRadius: 10,
    position: 'center center',
    size: 'contain',
    repeat: 'no-repeat'
  }

  const server = await startServer()
  const origin = `http://127.0.0.1:${server.address().port}`
  const profileDir = await mkdtemp(path.join(tmpdir(), 'bookmark-desk-shots-'))
  const debugPort = 9300 + Math.floor(Math.random() * 400)

  const chrome = spawn(findChrome(), [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--mute-audio',
    'about:blank'
  ], { stdio: 'ignore' })

  const cleanup = async () => {
    try { chrome.kill('SIGKILL') } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
    server.closeAllConnections?.()
    server.close()
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }

  try {
    await waitFor(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`)
        return response.ok
      } catch {
        return false
      }
    }, { label: ' Chrome 调试端口' })

    const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
      method: 'PUT'
    })).json()
    const cdp = await Cdp.connect(target.webSocketDebuggerUrl)

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false
    })

    let scriptId = null

    for (const shot of buildShots()) {
      if (scriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId })

      const injected = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: buildShim({
          favicons,
          background: {
            ...background,
            cardOpacity: shot.cardOpacity,
            cardSize: shot.cardSize
          },
          theme: shot.theme,
          tab: shot.tab
        })
      })
      scriptId = injected.identifier

      await cdp.send('Page.navigate', { url: `${origin}/index.html?shot=${encodeURIComponent(shot.file)}` })
      await waitFor(async () => {
        const { result } = await cdp.send('Runtime.evaluate', {
          expression: 'document.readyState',
          returnByValue: true
        })
        return result.value === 'complete'
      }, { label: '页面加载' })

      await cdp.send('Runtime.evaluate', {
        expression: 'document.fonts.ready.then(() => true)',
        awaitPromise: true,
        returnByValue: true
      })

      await waitFor(async () => {
        const { result } = await cdp.send('Runtime.evaluate', {
          expression: 'document.querySelectorAll(".module, .bookmark-item.is-tile").length',
          returnByValue: true
        })
        return Number(result.value) > 0
      }, { label: '书签卡片渲染' })

      await cdp.send('Runtime.evaluate', {
        expression: 'document.querySelector(".app-content")?.scrollTo(0, 0); window.scrollTo(0, 0);'
      })

      if (shot.action === 'settings') {
        await cdp.send('Runtime.evaluate', {
          expression: 'document.querySelector(\'button[aria-label="显示设置"]\')?.click()'
        })
        await waitFor(async () => {
          const { result } = await cdp.send('Runtime.evaluate', {
            expression: 'Boolean(document.querySelector(".modal"))',
            returnByValue: true
          })
          return result.value === true
        }, { label: '设置弹窗' })
      }

      await new Promise((resolve) => setTimeout(resolve, 450))

      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
        fromSurface: true,
        optimizeForSpeed: false
      })
      const buffer = Buffer.from(data, 'base64')
      const size = pngSize(buffer)
      await writeFile(path.join(OUT_DIR, shot.file), buffer)
      process.stdout.write(`✓ ${shot.file}  ${size.width}x${size.height}  ${(buffer.length / 1024).toFixed(0)} KB\n`)
    }

    cdp.close()
  } finally {
    await cleanup()
  }

  const files = (await readdir(OUT_DIR)).filter((name) => name.endsWith('.png')).sort()
  process.stdout.write(`\n${files.length} 张：${files.join(', ')}\n`)
}

main().catch((error) => {
  process.stderr.write(`截图失败：${error.message}\n`)
  process.exitCode = 1
})
