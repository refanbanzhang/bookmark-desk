import test from 'node:test'
import assert from 'node:assert/strict'
import { RECENT_VISITS_LIMIT } from '../src/constants.js'
import { rememberVisit, resolveRecentVisits } from '../src/utils/recentVisits.js'

const tree = [
  {
    id: 'box',
    title: '工作',
    children: [
      { id: 'a', title: 'Alpha', url: 'https://a.example/' },
      { id: 'b', title: 'Beta', url: 'https://b.example/' }
    ]
  },
  {
    id: 'lock',
    title: '加密',
    children: [{ id: 'c', title: 'Gamma', url: 'https://c.example/' }]
  }
]

test('rememberVisit keeps the newest visit first and drops duplicates', () => {
  const first = rememberVisit([], { id: 'a', url: 'https://a.example/', title: 'Alpha' }, 1)
  const second = rememberVisit(first, { id: 'b', url: 'https://b.example/', title: 'Beta' }, 2)
  const again = rememberVisit(second, { id: 'a', url: 'https://a.example/', title: 'Alpha' }, 3)
  assert.deepEqual(
    again.map((item) => item.id),
    ['a', 'b']
  )
  assert.equal(again[0].visitedAt, 3)
  assert.equal(again.length, 2)
})

test('rememberVisit ignores nodes without a url and caps the list', () => {
  let visits = []
  visits = rememberVisit(visits, { id: 'folder', title: '目录', children: [] }, 1)
  assert.deepEqual(visits, [])

  for (let index = 0; index < RECENT_VISITS_LIMIT + 3; index += 1) {
    visits = rememberVisit(visits, { id: `n${index}`, url: `https://e${index}.test/`, title: `N${index}` }, index)
  }
  assert.equal(visits.length, RECENT_VISITS_LIMIT)
  assert.equal(visits[0].id, `n${RECENT_VISITS_LIMIT + 2}`)
})

test('resolveRecentVisits follows visit order and skips missing or locked bookmarks', () => {
  const visits = [
    { id: 'c', url: 'https://c.example/', title: 'Gamma', visitedAt: 3 },
    { id: 'gone', url: 'https://gone.example/', title: 'Gone', visitedAt: 2 },
    { id: 'a', url: 'https://a.example/', title: 'Old', visitedAt: 1 }
  ]
  const visible = resolveRecentVisits(visits, tree, new Set(['lock']))
  assert.deepEqual(
    visible.map((node) => node.id),
    ['a']
  )
  assert.equal(visible[0].title, 'Alpha')
})
