export default function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement
    const current = html.getAttribute('data-theme')
    const next = current === 'light' ? 'dark' : 'light'
    html.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button class="theme-btn" onClick={toggle} aria-label="Toggle theme">
      🌓
    </button>
  )
}
