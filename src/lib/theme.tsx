import { useCallback, useEffect, useMemo, useState } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from './themeContext'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function readInitialTheme(): Theme {
  // The inline script in index.html has already resolved and applied a theme;
  // read it back so the first render matches the painted DOM.
  const applied = document.documentElement.getAttribute('data-theme')
  if (applied === 'light' || applied === 'dark') return applied
  return readStoredTheme() ?? 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage can be unavailable (private mode); the theme still applies.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
