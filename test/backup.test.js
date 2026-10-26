import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultBackgroundSettings } from '../src/utils/backgroundSettings.js'
import {
  BACKUP_VERSION,
  bookmarksToHtml,
  createBackupFile,
  parseBackupHtml,
  portableBookmarks,
  sanitizeBackground,
  sanitizeFolderAccess
} from '../src/utils/backup.js'

const now = () => new Date(2026, 9, 26, 8, 30, 0)

const background = (patch = {}) => ({
  ...createDefaultBackgroundSettings(),
  ...patch
})

const tree = [
  {
    id: '1',
    title: '书签栏',
    dateAdded: 1_710_000_000_000,
    parentId: '0',
    index: 0,
    children: [
      {
        id: '10',
        title: 'A & B "docs"',
        url: 'https://example.com/?a=1&b=2',
        dateAdded: 1_710_000_001_000,
        parentId: '1'
      },
      {
        id: '11',
        title: '空目录',
        children: [],
        parentId: '1'
      },
      {
        id: '12',
        title: 'a-->b',
        children: [
          { id: '13', title: '<script>', url: 'https://example.com/x', parentId: '12' }
        ]
      }
    ]
  },
  {
    id: '2',
    title: '其他书签',
    children: [{ id: '20', title: '其他', url: 'https://example.org/', parentId: '2' }]
  }
]

test('portable bookmarks keep only the fields a backup needs', () => {
  const bookmarks = portableBookmarks(tree, { markToolbar: true })

  assert.deepEqual(bookmarks[0], {
    id: '1',
    title: '书签栏',
    toolbar: true,
    added: 1_710_000_000_000,
    children: [
      {
        id: '10',
        title: 'A & B "docs"',
        url: 'https://example.com/?a=1&b=2',
        added: 1_710_000_001_000
      },
      { id: '11', title: '空目录', children: [] },
      {
        id: '12',
        title: 'a-->b',
        children: [{ id: '13', title: '<script>', url: 'https://example.com/x' }]
      }
    ]
  })
  assert.equal(bookmarks[1].toolbar, undefined)
  assert.equal(bookmarks[0].parentId, undefined)
  assert.deepEqual(tree[0].children[0], {
    id: '10',
    title: 'A & B "docs"',
    url: 'https://example.com/?a=1&b=2',
    dateAdded: 1_710_000_001_000,
    parentId: '1'
  })
})

test('toolbar flag is only for the chrome bookmark bar at the root', () => {
  const nested = portableBookmarks(
    [{ id: '9', title: '外层', children: [{ id: '1', title: '书签栏', children: [] }] }],
    { markToolbar: true }
  )
  assert.equal(nested[0].toolbar, undefined)
  assert.equal(nested[0].children[0].toolbar, undefined)
})

test('nodes that are neither folders nor bookmarks are dropped', () => {
  assert.deepEqual(portableBookmarks([null, { title: '空白' }, { title: '链接', url: '' }]), [])
})

test('netscape html escapes titles and marks the bookmark bar', () => {
  const html = bookmarksToHtml(portableBookmarks(tree, { markToolbar: true }), 'Bookmark Desk')

  assert.match(html, /^<!DOCTYPE NETSCAPE-Bookmark-file-1>/)
  assert.match(html, /<H3 ADD_DATE="1710000000" PERSONAL_TOOLBAR_FOLDER="true">书签栏<\/H3>/)
  assert.match(
    html,
    /<A HREF="https:\/\/example.com\/\?a=1&amp;b=2" ADD_DATE="1710000001">A &amp; B &quot;docs&quot;<\/A>/
  )
  assert.match(html, /<H3>a--&gt;b<\/H3>/)
  assert.match(html, />&lt;script&gt;<\/A>/)
  assert.doesNotMatch(html, /<script>/)
})

test('backup file round-trips bookmarks and local settings', () => {
  const file = createBackupFile({
    nodes: tree,
    source: 'chrome',
    theme: 'dark',
    activeTab: '11',
    background: background({
      enabled: true,
      imageUrl: 'https://example.com/bg.jpg',
      cardSize: 2
    }),
    folderAccess: {
      11: { salt: 'abc', hash: 'def', extra: 'no' }
    },
    now
  })

  assert.equal(file.filename, 'bookmark-desk-backup-2026-10-26.html')
  assert.equal(file.document.version, BACKUP_VERSION)
  assert.equal(file.document.source, 'chrome')
  assert.equal(file.document.settings.theme, 'dark')
  assert.equal(file.document.settings.activeTab, '11')
  assert.equal(file.document.settings.background.imageUrl, 'https://example.com/bg.jpg')
  assert.equal(file.document.settings.background.cardSize, 2)
  assert.deepEqual(file.document.settings.folderAccess, { 11: { salt: 'abc', hash: 'def' } })
  assert.deepEqual(parseBackupHtml(file.html), file.document)
  assert.match(file.html, /书签栏/)
  assert.doesNotMatch(file.html, /"salt":"abc"/)
})

test('demo backup is named as demo data', () => {
  const file = createBackupFile({
    nodes: [{ id: 'demo', title: '演示', children: [] }],
    source: 'demo',
    background: background(),
    folderAccess: {},
    now
  })

  assert.equal(file.filename, 'bookmark-desk-demo-2026-10-26.html')
  assert.equal(file.document.source, 'demo')
  assert.equal(file.document.bookmarks[0].toolbar, undefined)
  assert.match(file.html, /<TITLE>Bookmark Desk 演示数据<\/TITLE>/)
  assert.equal(parseBackupHtml(file.html).source, 'demo')
})

test('local background must be a real url or data url before it is written', () => {
  assert.throws(
    () => sanitizeBackground(background({ imageUrl: 'blob:http://localhost/1', mediaType: 'video' })),
    /本地背景还没有读出来/
  )
  assert.throws(
    () => sanitizeBackground(background({ imageUrl: 'javascript:alert(1)', enabled: true })),
    /背景地址无法写入备份/
  )
  assert.equal(
    sanitizeBackground(background({ imageUrl: 'data:image/png;base64,aaa', enabled: true })).imageUrl,
    'data:image/png;base64,aaa'
  )
})

test('broken folder passwords abort the backup', () => {
  assert.throws(() => sanitizeFolderAccess({ 1: { salt: '', hash: 'x' } }), /目录密码/)
  assert.throws(() => sanitizeFolderAccess([]), /目录密码/)
  assert.throws(
    () =>
      createBackupFile({
        nodes: [],
        source: 'chrome',
        background: background(),
        folderAccess: { 4: { salt: 'only' } },
        now
      }),
    /备份没有导出/
  )
})

test('a file without the settings payload is rejected', () => {
  assert.throws(() => parseBackupHtml(bookmarksToHtml([], 'Bookmarks')), /缺少本机设置/)
  assert.throws(() => parseBackupHtml('not a backup'), /不是书签备份文件/)
  const file = createBackupFile({
    nodes: [],
    source: 'chrome',
    background: background(),
    folderAccess: {},
    now
  })
  const lines = file.html.trimEnd().split('\n')
  const encoded = lines.at(-2)
  lines[lines.length - 2] = `${encoded.slice(0, -1)}${encoded.endsWith('A') ? 'B' : 'A'}`
  assert.throws(() => parseBackupHtml(`${lines.join('\n')}\n`), /已损坏|无法识别/)
})
