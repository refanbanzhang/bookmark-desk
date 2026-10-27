import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'src/styles/components.css'), 'utf8')
const app = readFileSync(join(root, 'src/App.vue'), 'utf8')
const composable = readFileSync(join(root, 'src/composables/useBackgroundImage.js'), 'utf8')

const block = (source, selector) => {
  const match = source.match(new RegExp(`${selector.replace('.', '\\.')} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `missing ${selector} rule`)
  return match[0]
}

test('new-tab wallpaper layer fits the full image instead of cropping', () => {
  const backdrop = block(css, '.page-backdrop')
  const video = block(css, '.page-backdrop__video')

  assert.match(backdrop, /background-size:\s*contain/)
  assert.doesNotMatch(backdrop, /background-size:\s*cover/)
  assert.match(video, /object-fit:\s*contain/)
  assert.doesNotMatch(video, /object-fit:\s*cover/)
})

test('selecting a wallpaper still writes the full-resolution url onto the live backdrop', () => {
  assert.match(app, /class="page-backdrop"/)
  assert.match(app, /backdropEl\.value\.style\.backgroundImage = backdropImageUrl\.value/)
  assert.match(composable, /backgroundSize:\s*settings\.size/)
  assert.match(composable, /selectPresetWallpaper/)
  assert.match(composable, /backgroundDraft\.value\.imageUrl = url/)
})
