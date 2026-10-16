/**
 * 把 dist/ 打成 Chrome 应用商店可上传的 zip。
 * 商店要求 manifest.json 位于压缩包根目录，所以 cwd 进 dist 再打包，不能套一层文件夹。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const manifestPath = join(distDir, 'manifest.json')

if (!existsSync(manifestPath)) {
  console.error('找不到 dist/manifest.json，先执行 npm run build')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (!manifest.version) {
  console.error('dist/manifest.json 缺少 version 字段')
  process.exit(1)
}

const releaseDir = join(root, 'release')
const zipPath = join(releaseDir, `bookmark-desk-${manifest.version}.zip`)

mkdirSync(releaseDir, { recursive: true })

execFileSync(
  'zip',
  [
    '-r',
    '-q',
    '-X',
    zipPath,
    '.',
    '-x', '.*',
    '-x', '*/.*',
    '-x', '__MACOSX/*',
  ],
  { cwd: distDir, stdio: 'inherit' }
)

const sizeKb = Math.round(statSync(zipPath).size / 1024)
console.log(`已生成 release/bookmark-desk-${manifest.version}.zip（${sizeKb} KB）`)
console.log('上传前确认：manifest.json 与 128x128 图标在压缩包根目录、版本号高于商店已发布版本。')
