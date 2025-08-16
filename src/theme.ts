import '@unocss/reset/tailwind.css'
import 'uno.css'

const isDark =
  localStorage.theme === 'dark' || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

if (isDark) {
  document.querySelector('html')?.setAttribute('data-theme', 'dark')
} else {
  document.querySelector('html')?.setAttribute('data-theme', 'light')
}

const onReady = () => {
  const el = document.querySelector('#dark-mode-toggle')
  if (isDark) {
    el?.setAttribute('checked', 'checked')
  }
  el?.addEventListener('change', (e: Event) => {
    const theme = (e.target as HTMLInputElement).checked ? 'dark' : 'light'
    localStorage.theme = theme
    document.querySelector('html')?.setAttribute('data-theme', theme)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady)
} else {
  onReady()
}
