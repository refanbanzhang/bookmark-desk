import { createApp } from 'vue'
import './styles/index.css'
import App from './App.vue'
import { initLocale } from './i18n'

initLocale()
createApp(App).mount('#app')
