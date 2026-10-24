import { ref } from 'vue'
import { THEME_KEY } from '../constants'
import { requestSyncPush } from './syncBridge'

const theme = ref('light')

const applyTheme = (value) => {
  theme.value = value === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme.value)
}

/**
 * 主题：读取本地偏好，缺省时跟随系统。
 * 切换动效由 CSS 过渡承担，不再需要时间轴。
 */
export const useTheme = () => {
  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved)
      return
    }

    const preferDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    applyTheme(preferDark ? 'dark' : 'light')
  }

  const setTheme = (value) => {
    if (value !== 'dark' && value !== 'light') {
      return
    }
    applyTheme(value)
    localStorage.setItem(THEME_KEY, value)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
    requestSyncPush()
  }

  return { theme, initTheme, toggleTheme, setTheme }
}
