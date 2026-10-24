const getCenterPaddingRatio = (isCurrentTarget) => {
  // Harder to enter, easier to stay: prevents boundary flicker.
  return isCurrentTarget ? 0.14 : 0.24
}

export const getFolderDropSurface = (element) => {
  const dropTarget = element?.closest?.('[data-folder-drop-id]')
  if (dropTarget) {
    return dropTarget.closest('.module--folder-card, .row') || dropTarget
  }

  return element?.closest?.('.bookmark-item.is-folder') || null
}

export const isFolderCenterDrop = ({
  clientX,
  clientY,
  rectLeft,
  rectTop,
  rectWidth,
  rectHeight,
  isCurrentTarget
}) => {
  const paddingRatio = getCenterPaddingRatio(Boolean(isCurrentTarget))
  const horizontalPadding = rectWidth * paddingRatio
  const verticalPadding = rectHeight * paddingRatio

  const inHorizontalCenter =
    clientX > rectLeft + horizontalPadding && clientX < rectLeft + rectWidth - horizontalPadding
  const inVerticalCenter =
    clientY > rectTop + verticalPadding && clientY < rectTop + rectHeight - verticalPadding

  return inHorizontalCenter && inVerticalCenter
}

export const isFolderCenterDropTarget = ({
  element,
  clientX,
  clientY,
  isCurrentTarget
}) => {
  const surface = getFolderDropSurface(element)
  if (!surface) {
    return false
  }

  const rect = surface.getBoundingClientRect()
  return isFolderCenterDrop({
    clientX,
    clientY,
    rectLeft: rect.left,
    rectTop: rect.top,
    rectWidth: rect.width,
    rectHeight: rect.height,
    isCurrentTarget
  })
}
