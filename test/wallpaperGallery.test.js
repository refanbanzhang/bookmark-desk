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
  assert.match(dialog, /@click="selectPresetWallpaper\(item\)"/)
  assert.match(dialog, /:title="item\.title"/)
})

test('gallery thumbs contain the full subject and do not clip the frame', () => {
  const item = block(css, '.gallery-item')
  const thumb = block(css, '.gallery-thumb')

  assert.doesNotMatch(item, /overflow:\s*hidden/)
  assert.match(thumb, /object-fit:\s*contain/)
  assert.match(thumb, /aspect-ratio:\s*4\s*\/\s*3/)
})
