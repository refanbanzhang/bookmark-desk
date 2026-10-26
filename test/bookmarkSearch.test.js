import test from 'node:test'
import assert from 'node:assert/strict'
import { searchBookmarks } from '../src/utils/bookmarkSearch.js'

const tree = [
  {
    id: 'dev',
    title: '开发',
    children: [
      { id: 'gh', title: 'GitHub', url: 'https://github.com/' },
      { id: 'so', title: 'Stack Overflow', url: 'https://stackoverflow.com/' },
      {
        id: 'front',
        title: '前端框架',
        children: [{ id: 'vue', title: 'Vue', url: 'https://vuejs.org/' }]
      }
    ]
  },
  {
    id: 'secret',
    title: '私密',
    children: [{ id: 'hidden', title: 'Secret Notes', url: 'https://example.com/secret' }]
  },
  { id: 'mail', title: 'Gmail', url: 'https://mail.google.com/' }
]

const ids = (nodes) => nodes.map((node) => node.id)

test('blank query matches nothing', () => {
  assert.deepEqual(searchBookmarks(tree, '   '), [])
})

test('matches bookmark title and url, ignoring protocol and case', () => {
  assert.deepEqual(ids(searchBookmarks(tree, 'github')), ['gh'])
  assert.deepEqual(ids(searchBookmarks(tree, 'GitHub.com')), ['gh'])
  assert.deepEqual(ids(searchBookmarks(tree, 'vuejs.org')), ['vue'])
})

test('matches folder title', () => {
  assert.deepEqual(ids(searchBookmarks(tree, '前端')), ['front'])
})

test('fuzzy subsequence matches title and address', () => {
  assert.deepEqual(ids(searchBookmarks(tree, 'gthub')), ['gh'])
  assert.deepEqual(ids(searchBookmarks(tree, 'stk')), ['so'])
})

test('every word must match title or address', () => {
  assert.deepEqual(ids(searchBookmarks(tree, 'google mail')), ['mail'])
  assert.deepEqual(ids(searchBookmarks(tree, 'google vue')), [])
})

test('locked folder stays searchable but its children do not', () => {
  const hidden = new Set(['secret'])
  assert.deepEqual(ids(searchBookmarks(tree, '私密', hidden)), ['secret'])
  assert.deepEqual(ids(searchBookmarks(tree, 'secret', hidden)), [])
  assert.deepEqual(ids(searchBookmarks(tree, 'secret')), ['hidden'])
})
