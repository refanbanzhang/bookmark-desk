import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dialog = readFileSync(join(root, 'src/components/BackgroundSettingsDialog.vue'), 'utf8')
const css = readFileSync(join(root, 'src/styles/components.css'), 'utf8')

const block = (source, selector) => {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `missing ${selector} rule`)
  return match[0]
}

test('gallery tiles keep thumb previews and hide wallpaper titles', () => {
  assert.equal(dialog.includes('gallery-name'), false)
  assert.match(dialog, /:src="item\.thumbUrl"/)
  assert.match(dialog, /@click="downloadPresetWallpaper\(item\)"/)
  assert.match(dialog, /gallery-loading/)
  assert.equal(dialog.includes('<video'), false)
  assert.equal(dialog.includes('item.url'), false)
  assert.equal(dialog.includes('galleryPreview'), false)
  assert.match(dialog, /:title="item\.title"/)
})

test('gallery thumbs fill a 16:9 card instead of sitting in a gray mat', () => {
  const item = block(css, '.gallery-item')
  const thumb = block(css, '.gallery-thumb')

  assert.match(item, /overflow:\s*hidden/)
  assert.match(item, /aspect-ratio:\s*16\s*\/\s*9/)
  assert.match(thumb, /object-fit:\s*cover/)
  assert.match(thumb, /height:\s*100%/)
  assert.doesNotMatch(thumb, /object-fit:\s*contain/)
})
