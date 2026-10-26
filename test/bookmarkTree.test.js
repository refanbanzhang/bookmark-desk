import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findNodePath,
  getMoveToIndexPosition,
  getFolderOrderMovePosition,
  insertChildNode,
  moveNodeToFinalIndexInTree,
  moveNodeToIndexInTree,
  swapNodesInTree
} from '../src/utils/bookmarkTree.js'

const makeTree = () => [
  {
    id: 'bar',
    title: '书签栏',
    children: [
      { id: 'b1', title: 'Vue' },
      { id: 'b2', title: 'Vite' },
      {
        id: 'b3',
        title: '设计灵感',
        children: [
          { id: 'b3-1', title: 'Dribbble' },
          { id: 'b3-2', title: 'Behance' }
        ]
      }
    ]
  }
]

test('getMoveToIndexPosition adjusts index when moving forward in same parent', () => {
  const position = getMoveToIndexPosition(makeTree(), 'b1', 'bar', 2)
  assert.deepEqual(position, {
    parentId: 'bar',
    index: 1,
    sourceParentId: 'bar',
    targetParentId: 'bar'
  })
})

test('moveNodeToIndexInTree inserts at exact preview slot', () => {
  const moved = moveNodeToIndexInTree(makeTree(), 'b2', 'bar', 0)
  assert.deepEqual(
    moved[0].children.map((node) => node.id),
    ['b2', 'b1', 'b3']
  )
})

test('moveNodeToIndexInTree supports moving child to parent sibling list', () => {
  const moved = moveNodeToIndexInTree(makeTree(), 'b3-2', 'bar', 1)
  assert.deepEqual(
    moved[0].children.map((node) => node.id),
    ['b1', 'b3-2', 'b2', 'b3']
  )
  assert.deepEqual(
    moved[0].children.find((node) => node.id === 'b3').children.map((node) => node.id),
    ['b3-1']
  )
})

test('moveNodeToFinalIndexInTree places node at final same-parent index', () => {
  const moved = moveNodeToFinalIndexInTree(makeTree(), 'b1', 'bar', 2)
  assert.deepEqual(
    moved[0].children.map((node) => node.id),
    ['b2', 'b3', 'b1']
  )
})

test('moveNodeToFinalIndexInTree can append bookmark into another folder', () => {
  const moved = moveNodeToFinalIndexInTree(makeTree(), 'b2', 'b3', 2)
  assert.deepEqual(
    moved[0].children.map((node) => node.id),
    ['b1', 'b3']
  )
  assert.deepEqual(
    moved[0].children.find((node) => node.id === 'b3').children.map((node) => node.id),
    ['b3-1', 'b3-2', 'b2']
  )
})

test('swapNodesInTree swaps two siblings without shifting others', () => {
  const swapped = swapNodesInTree(makeTree(), 'b1', 'b3')
  assert.deepEqual(
    swapped[0].children.map((node) => node.id),
    ['b3', 'b2', 'b1']
  )
})

const makeRootOrder = () => [
  { id: 'f1', title: '工作台', children: [{ id: 'x1', title: 'Gmail' }] },
  { id: 'p1', title: '散落书签', url: 'https://example.com/' },
  { id: 'f2', title: '开发', children: [] },
  { id: 'f3', title: '阅读', children: [] }
]

test('getFolderOrderMovePosition places a folder ahead of the folder that follows it', () => {
  assert.deepEqual(getFolderOrderMovePosition(makeRootOrder(), 'f1', 'f3'), {
    targetIndex: 2,
    chromeIndex: 3
  })
})

test('getFolderOrderMovePosition appends to the end when nothing follows', () => {
  assert.deepEqual(getFolderOrderMovePosition(makeRootOrder(), 'f1', null), {
    targetIndex: 3,
    chromeIndex: 4
  })
})

test('getFolderOrderMovePosition keeps the chrome index for a move upwards', () => {
  assert.deepEqual(getFolderOrderMovePosition(makeRootOrder(), 'f3', 'f1'), {
    targetIndex: 0,
    chromeIndex: 0
  })
})

test('getFolderOrderMovePosition rejects nodes that are not top level', () => {
  assert.equal(getFolderOrderMovePosition(makeTree(), 'b1', 'bar'), null)
})

test('findNodePath returns ids from the root down to the target', () => {
  assert.deepEqual(findNodePath(makeTree(), 'b3-2'), ['bar', 'b3', 'b3-2'])
  assert.equal(findNodePath(makeTree(), 'missing'), null)
})

test('insertChildNode appends a folder and throws when the parent is missing', () => {
  const folder = { id: 'b4', title: '新建', children: [] }
  const next = insertChildNode(makeTree(), 'b3', folder)
  assert.deepEqual(
    next[0].children.find((node) => node.id === 'b3').children.map((node) => node.id),
    ['b3-1', 'b3-2', 'b4']
  )
  assert.throws(() => insertChildNode(makeTree(), 'missing', folder), /找不到上级目录/)
  const rooted = insertChildNode(makeTree(), null, folder)
  assert.equal(rooted.at(-1).id, 'b4')
})
