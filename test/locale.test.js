import assert from 'node:assert/strict'
import test from 'node:test'
import { messages, locale, matchLocale, resolveInitialLocale, t, text } from '../src/i18n.js'

test('picks the first browser language this app can speak', () => {
  assert.equal(matchLocale(['zh-CN', 'en-US']), 'zh')
  assert.equal(matchLocale(['zh-Hant', 'en']), 'zh')
  assert.equal(matchLocale(['en-GB', 'zh-CN']), 'en')
  assert.equal(matchLocale(['ja', 'en-US']), 'en')
  assert.equal(matchLocale(['fr']), 'en')
  assert.equal(matchLocale([]), 'en')
})

test('a saved choice beats the browser', () => {
  assert.equal(resolveInitialLocale({ getItem: () => 'en' }, ['zh-CN']), 'en')
  assert.equal(resolveInitialLocale({ getItem: () => 'zh' }, ['en-US']), 'zh')
  assert.equal(resolveInitialLocale({ getItem: () => null }, ['zh-TW']), 'zh')
  assert.equal(resolveInitialLocale({ getItem: () => 'nope' }, ['de', 'en']), 'en')
})

test('stored messages stay unique so translation can find them', () => {
  const values = Object.entries(messages.zh)
    .filter(([key]) => key.startsWith('error.') || key.startsWith('warn.'))
    .map(([, value]) => value)
  assert.equal(new Set(values).size, values.length)
})

test('translates the active locale, including stored error text', () => {
  locale.value = 'zh'
  assert.equal(t('topbar.search'), '搜索标题或地址')
  assert.equal(t('module.count', { count: 2 }), '2 项')
  assert.equal(text('找不到上级目录'), '找不到上级目录')
  assert.equal(text('读取目录密码失败：数据格式无效。'), '读取目录密码失败：数据格式无效。')

  locale.value = 'en'
  assert.equal(t('topbar.search'), 'Search title or URL')
  assert.equal(t('module.count1', { count: 1 }), '1 item')
  assert.equal(text('找不到上级目录'), 'Parent folder not found')
  assert.equal(text('读取目录密码失败：数据格式无效。'), 'Couldn’t read the folder password: Invalid data.')
  assert.equal(
    text({ key: 'warn.deleteFailed', params: { detail: 'error.chromePermission' } }),
    'Couldn’t delete: Check the Chrome bookmarks permission.'
  )

  locale.value = 'zh'
})
