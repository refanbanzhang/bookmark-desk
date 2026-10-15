const cloneNode = (node) => ({
  ...node,
  children: Array.isArray(node?.children) ? cloneNodes(node.children) : undefined
})

export const cloneNodes = (nodes = []) => nodes.map((node) => cloneNode(node))

export const hasChildren = (node) => Array.isArray(node?.children)

export const collectNodeIds = (nodes = [], output = []) => {
  for (const node of nodes) {
    output.push(String(node.id))
    if (hasChildren(node)) {
      collectNodeIds(node.children, output)
    }
  }
  return output
}

export const collectNodes = (nodes = [], output = []) => {
  for (const node of nodes) {
    output.push(node)
    if (hasChildren(node)) {
      collectNodes(node.children, output)
    }
  }
  return output
}

export const findNodeById = (nodes = [], targetId) => {
  for (const node of nodes) {
    if (String(node.id) === String(targetId)) {
      return node
    }
    if (hasChildren(node)) {
      const match = findNodeById(node.children, targetId)
      if (match) {
        return match
      }
    }
  }
  return null
}

const containsId = (node, targetId) => {
  if (String(node?.id) === String(targetId)) {
    return true
  }
  if (!hasChildren(node)) {
    return false
  }
  return node.children.some((child) => containsId(child, targetId))
}

const findNodeLocation = (nodes = [], targetId, parentId = null) => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (String(node.id) === String(targetId)) {
      return {
        parentId,
        index,
        node
      }
    }

    if (hasChildren(node)) {
      const nested = findNodeLocation(node.children, targetId, node.id)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

const getSiblingList = (nodes = [], parentId = null) => {
  if (parentId === null || parentId === undefined) {
    return nodes
  }

  const parentNode = findNodeById(nodes, parentId)
  if (!parentNode || !Array.isArray(parentNode.children)) {
    return null
  }

  return parentNode.children
}

const removeNodeRecursive = (nodes = [], targetId) => {
  let removedNode = null
  const nextNodes = []

  for (const node of nodes) {
    if (String(node.id) === String(targetId)) {
      removedNode = cloneNode(node)
      continue
    }

    if (hasChildren(node)) {
      const result = removeNodeRecursive(node.children, targetId)
      if (result.removedNode) {
        removedNode = result.removedNode
      }
      nextNodes.push({
        ...node,
        children: result.nodes
      })
      continue
    }

    nextNodes.push({ ...node })
  }

  return { nodes: nextNodes, removedNode }
}

const insertNodeIntoFolder = (nodes = [], targetFolderId, nodeToInsert) =>
  nodes.map((node) => {
    if (String(node.id) === String(targetFolderId)) {
      const children = hasChildren(node) ? cloneNodes(node.children) : []
      children.push(cloneNode(nodeToInsert))
      return {
        ...node,
        children
      }
    }

    if (hasChildren(node)) {
      return {
        ...node,
        children: insertNodeIntoFolder(node.children, targetFolderId, nodeToInsert)
      }
    }

    return { ...node }
  })

const insertNodeAtIndex = (nodes = [], parentId, index, nodeToInsert) => {
  const nextNode = cloneNode(nodeToInsert)
  const safeIndex = (length) => Math.max(0, Math.min(index, length))

  if (parentId === null || parentId === undefined) {
    const next = cloneNodes(nodes)
    next.splice(safeIndex(next.length), 0, nextNode)
    return { nodes: next, inserted: true }
  }

  let inserted = false
  const next = nodes.map((node) => {
    if (String(node.id) === String(parentId)) {
      const children = hasChildren(node) ? cloneNodes(node.children) : []
      children.splice(safeIndex(children.length), 0, nextNode)
      inserted = true
      return {
        ...node,
        children
      }
    }

    if (hasChildren(node)) {
      const result = insertNodeAtIndex(node.children, parentId, index, nodeToInsert)
      if (result.inserted) {
        inserted = true
        return {
          ...node,
          children: result.nodes
        }
      }
    }

    return { ...node }
  })

  return { nodes: next, inserted }
}

const clampIndex = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeParentId = (parentId) => {
  if (parentId === null || parentId === undefined || parentId === '') {
    return null
  }
  return String(parentId)
}

export const pruneNodesByIds = (nodes = [], ids = []) => {
  const idSet = new Set(ids.map(String))

  return nodes.flatMap((node) => {
    if (idSet.has(String(node.id))) {
      return []
    }

    if (hasChildren(node)) {
      return [
        {
          ...node,
          children: pruneNodesByIds(node.children, ids)
        }
      ]
    }

    return [{ ...node }]
  })
}

export const renameNodeInTree = (nodes = [], targetId, title) =>
  nodes.map((node) => {
    if (String(node.id) === String(targetId)) {
      return {
        ...node,
        title
      }
    }

    if (hasChildren(node)) {
      return {
        ...node,
        children: renameNodeInTree(node.children, targetId, title)
      }
    }

    return { ...node }
  })

export const replaceNodesAtParent = (nodes = [], parentId, nextChildren = []) => {
  if (parentId === null || parentId === undefined || parentId === '') {
    return cloneNodes(nextChildren)
  }

  return nodes.map((node) => {
    if (String(node.id) === String(parentId)) {
      return {
        ...node,
        children: cloneNodes(nextChildren)
      }
    }

    if (hasChildren(node)) {
      return {
        ...node,
        children: replaceNodesAtParent(node.children, parentId, nextChildren)
      }
    }

    return { ...node }
  })
}

export const moveNodeInTree = (nodes = [], sourceId, targetFolderId) => {
  if (String(sourceId) === String(targetFolderId)) {
    return nodes
  }

  const sourceNode = findNodeById(nodes, sourceId)
  const targetNode = findNodeById(nodes, targetFolderId)

  if (!sourceNode || !targetNode || !hasChildren(targetNode)) {
    return nodes
  }

  if (containsId(sourceNode, targetFolderId)) {
    return nodes
  }

  const removal = removeNodeRecursive(nodes, sourceId)
  if (!removal.removedNode) {
    return nodes
  }

  return insertNodeIntoFolder(removal.nodes, targetFolderId, removal.removedNode)
}

export const getNodeLocation = (nodes = [], targetId) => findNodeLocation(nodes, targetId)

/**
 * 顶层目录换位：目录之间只有先后，没有父子关系。
 * beforeId 为空表示排到顶层末尾；本地索引用「移除自身后」的数组，Chrome 用「含自身」的数组。
 */
export const getFolderOrderMovePosition = (nodes = [], sourceId, beforeId = null) => {
  const position = beforeId
    ? getMoveBeforePosition(nodes, sourceId, beforeId)
    : getMoveToIndexPosition(nodes, sourceId, null, nodes.length)
  const sourceLocation = findNodeLocation(nodes, sourceId)

  if (!position || !sourceLocation || position.parentId !== null || sourceLocation.parentId !== null) {
    return null
  }

  return {
    targetIndex: position.index,
    chromeIndex: sourceLocation.index <= position.index ? position.index + 1 : position.index
  }
}

export const canSwapNodes = (nodes = [], sourceId, targetId) => {
  if (String(sourceId) === String(targetId)) {
    return false
  }

  const sourceLocation = findNodeLocation(nodes, sourceId)
  const targetLocation = findNodeLocation(nodes, targetId)
  if (!sourceLocation || !targetLocation) {
    return false
  }

  if (containsId(sourceLocation.node, targetId) || containsId(targetLocation.node, sourceId)) {
    return false
  }

  return true
}

export const swapNodesInTree = (nodes = [], sourceId, targetId) => {
  if (!canSwapNodes(nodes, sourceId, targetId)) {
    return nodes
  }

  const nextNodes = cloneNodes(nodes)
  const sourceLocation = findNodeLocation(nextNodes, sourceId)
  const targetLocation = findNodeLocation(nextNodes, targetId)
  if (!sourceLocation || !targetLocation) {
    return nodes
  }

  const sourceList = getSiblingList(nextNodes, sourceLocation.parentId)
  const targetList = getSiblingList(nextNodes, targetLocation.parentId)
  if (!sourceList || !targetList) {
    return nodes
  }

  const sourceNode = sourceList[sourceLocation.index]
  const targetNode = targetList[targetLocation.index]
  sourceList[sourceLocation.index] = targetNode
  targetList[targetLocation.index] = sourceNode

  return nextNodes
}

export const getMoveToIndexPosition = (nodes = [], sourceId, targetParentId, targetIndex) => {
  const source = String(sourceId || '')
  if (!source) {
    return null
  }

  const sourceLocation = findNodeLocation(nodes, source)
  if (!sourceLocation) {
    return null
  }

  const sourceParent = normalizeParentId(sourceLocation.parentId)
  const targetParent = normalizeParentId(targetParentId)

  if (targetParent !== null) {
    const targetParentNode = findNodeById(nodes, targetParent)
    if (!targetParentNode || !Array.isArray(targetParentNode.children)) {
      return null
    }
  }

  if (targetParent !== null && containsId(sourceLocation.node, targetParent)) {
    return null
  }

  const targetSiblings =
    targetParent === null
      ? nodes
      : findNodeById(nodes, targetParent)?.children || []
  let index = clampIndex(Number.isFinite(Number(targetIndex)) ? Number(targetIndex) : 0, 0, targetSiblings.length)

  if (sourceParent === targetParent && sourceLocation.index < index) {
    index -= 1
  }

  return {
    parentId: targetParent,
    index: clampIndex(index, 0, targetSiblings.length),
    sourceParentId: sourceParent,
    targetParentId: targetParent
  }
}

export const getMoveBeforePosition = (nodes = [], sourceId, targetId) => {
  if (String(sourceId) === String(targetId)) {
    return null
  }

  const targetLocation = findNodeLocation(nodes, targetId)
  if (!targetLocation) {
    return null
  }

  return getMoveToIndexPosition(nodes, sourceId, targetLocation.parentId ?? null, targetLocation.index)
}

export const moveNodeBeforeInTree = (nodes = [], sourceId, targetId) => {
  const position = getMoveBeforePosition(nodes, sourceId, targetId)
  if (!position) {
    return nodes
  }

  const removal = removeNodeRecursive(nodes, sourceId)
  if (!removal.removedNode) {
    return nodes
  }

  const insertion = insertNodeAtIndex(removal.nodes, position.parentId, position.index, removal.removedNode)
  if (!insertion.inserted) {
    return nodes
  }

  return insertion.nodes
}

export const moveNodeToIndexInTree = (nodes = [], sourceId, targetParentId, targetIndex) => {
  const position = getMoveToIndexPosition(nodes, sourceId, targetParentId, targetIndex)
  if (!position) {
    return nodes
  }

  const removal = removeNodeRecursive(nodes, sourceId)
  if (!removal.removedNode) {
    return nodes
  }

  const insertion = insertNodeAtIndex(removal.nodes, position.parentId, position.index, removal.removedNode)
  if (!insertion.inserted) {
    return nodes
  }

  return insertion.nodes
}

export const moveNodeToFinalIndexInTree = (nodes = [], sourceId, targetParentId, targetIndex) => {
  const source = String(sourceId || '')
  if (!source) {
    return nodes
  }

  const sourceLocation = findNodeLocation(nodes, source)
  if (!sourceLocation) {
    return nodes
  }

  const targetParent = normalizeParentId(targetParentId)
  if (targetParent !== null) {
    const targetParentNode = findNodeById(nodes, targetParent)
    if (!targetParentNode || !Array.isArray(targetParentNode.children)) {
      return nodes
    }
    if (containsId(sourceLocation.node, targetParent)) {
      return nodes
    }
  }

  const removal = removeNodeRecursive(nodes, source)
  if (!removal.removedNode) {
    return nodes
  }

  const targetSiblings =
    targetParent === null
      ? removal.nodes
      : findNodeById(removal.nodes, targetParent)?.children || []
  const index = clampIndex(Number.isFinite(Number(targetIndex)) ? Number(targetIndex) : 0, 0, targetSiblings.length)

  const insertion = insertNodeAtIndex(removal.nodes, targetParent, index, removal.removedNode)
  if (!insertion.inserted) {
    return nodes
  }

  return insertion.nodes
}

export const isFolderNode = (node) => hasChildren(node)
