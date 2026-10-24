import { peekBackgroundSettings, hasStoredLocalBackgroundMedia } from '../utils/backgroundSettings'
import {
  SYNC_PREFS_KEY,
  createSyncRecord,
  explicitTheme,
  isSyncRecord,
  isUntouchedPrefs,
  planSyncApply,
  readCursor,
  writeCursor
} from '../utils/syncPrefs'
import { useTheme } from './useTheme'
import { useBackgroundImage } from './useBackgroundImage'
import { bindSyncPush, currentPrefsSnapshot, takePendingSync } from './syncBridge'

const syncArea = () => {
  const sync = globalThis.chrome?.storage?.sync
  return sync?.get && sync?.set ? sync : null
}

/**
 * 显示偏好走 chrome.storage.sync。
 * 本机 localStorage 仍是首帧缓存；同步只覆盖主题和显示设置里约定的那几项。
 */
export const initSyncPrefs = async () => {
  const area = syncArea()
  if (!area || !globalThis.chrome?.storage?.onChanged) {
    return () => {}
  }

  const { setTheme } = useTheme()
  const { applySyncedBackground } = useBackgroundImage()
  let hydrating = true
  let applying = false
  let pushing = false
  let pushAgain = false
  let lastRecord = null
  const localRevs = new Set()

  const readRemote = async () => {
    const data = await area.get(SYNC_PREFS_KEY)
    return data?.[SYNC_PREFS_KEY] ?? null
  }

  const push = async () => {
    if (hydrating || applying) {
      return
    }
    if (pushing) {
      pushAgain = true
      return
    }

    pushing = true
    try {
      do {
        pushAgain = false
        takePendingSync()
        const snap = currentPrefsSnapshot()
        const settings = snap?.settings ?? peekBackgroundSettings()
        const localMedia = snap ? snap.localMedia : hasStoredLocalBackgroundMedia()
        if (!lastRecord) {
          const remote = await readRemote()
          lastRecord = isSyncRecord(remote) ? remote : null
        }

        const { record, changed } = createSyncRecord({
          settings,
          theme: explicitTheme(),
          previous: lastRecord,
          shareImage: !localMedia
        })
        if (!changed) {
          continue
        }

        localRevs.add(record.rev)
        try {
          await area.set({ [SYNC_PREFS_KEY]: record })
        } catch (error) {
          localRevs.delete(record.rev)
          console.error('显示设置同步失败', error)
          return
        }

        lastRecord = record
        writeCursor(localStorage, { rev: record.rev, imageRev: record.imageRev })
      } while (pushAgain)
    } finally {
      pushing = false
    }
  }

  const applyRemote = async (record, cursor = readCursor()) => {
    const plan = planSyncApply({ record, cursor })
    if (!plan) {
      lastRecord = isSyncRecord(record) ? record : lastRecord
      return
    }

    applying = true
    try {
      if (plan.theme) {
        setTheme(plan.theme)
      }
      if (plan.appearance || plan.image) {
        await applySyncedBackground(plan)
      }
      writeCursor(localStorage, plan.cursor)
      lastRecord = record
    } catch (error) {
      console.error('应用同步设置失败', error)
    } finally {
      applying = false
    }
  }

  const onChanged = (changes, areaName) => {
    if (areaName !== 'sync' || applying) {
      return
    }

    const next = changes?.[SYNC_PREFS_KEY]?.newValue
    if (!next) {
      return
    }
    if (localRevs.has(next.rev)) {
      localRevs.delete(next.rev)
      return
    }

    /* 同一浏览器里的其他新标签页共享 localStorage 光标，不能用它判断这页要不要更新 */
    const seen = lastRecord
      ? { rev: Number(lastRecord.rev) || 0, imageRev: Number(lastRecord.imageRev) || 0 }
      : readCursor()
    void applyRemote(next, seen)
  }

  globalThis.chrome.storage.onChanged.addListener(onChanged)
  bindSyncPush(push)

  let pendingDuringRead = false
  let readable = false
  try {
    const remote = await readRemote()
    readable = true
    pendingDuringRead = takePendingSync()
    if (isSyncRecord(remote)) {
      lastRecord = remote
      if (!pendingDuringRead) {
        await applyRemote(remote)
      }
    }
  } catch (error) {
    console.error('读取同步设置失败', error)
  } finally {
    hydrating = false
  }

  const snap = currentPrefsSnapshot()
  const shouldSeed = readable && !lastRecord && !isUntouchedPrefs(
    snap?.settings ?? peekBackgroundSettings(),
    explicitTheme()
  )
  if (pendingDuringRead || takePendingSync() || shouldSeed) {
    await push()
  }

  return () => {
    globalThis.chrome.storage.onChanged.removeListener(onChanged)
    bindSyncPush(null)
  }
}
