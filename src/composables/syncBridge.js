import { isLocalBackgroundSource } from '../utils/backgroundSettings'

let snapshot = null
let pushImpl = null
let pending = false

export const rememberPrefs = (settings) => {
  const imageUrl = typeof settings?.imageUrl === 'string' ? settings.imageUrl : ''
  const next = { ...settings, imageUrl }
  snapshot = {
    settings: next,
    localMedia: isLocalBackgroundSource(next)
  }
}

export const currentPrefsSnapshot = () => snapshot

export const takePendingSync = () => {
  const value = pending
  pending = false
  return value
}

export const bindSyncPush = (impl) => {
  pushImpl = impl
}

/** 本地偏好变了。同步还没就绪时先记着，就绪后补推一次。 */
export const requestSyncPush = () => {
  pending = true
  if (pushImpl) {
    void pushImpl()
  }
}
