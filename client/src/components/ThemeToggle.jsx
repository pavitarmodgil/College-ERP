import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors rounded-xl"
      aria-label="Toggle theme"
    >
      <span className="material-symbols-outlined text-xl flex-shrink-0">
        {dark ? 'light_mode' : 'dark_mode'}
      </span>
      <span className="hidden md:inline text-sm">Theme</span>
    </button>
  )
}
