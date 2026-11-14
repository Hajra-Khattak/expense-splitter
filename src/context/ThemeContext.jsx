import { createContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export const ThemeContext = createContext(null)

const STORAGE_KEY = 'theme'

// Saved choice first, then the device setting, then light.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage can be blocked; fall through
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// NOTE: this provider uses useAuth, so AuthProvider must wrap ThemeProvider.
export function ThemeProvider({ children }) {
  const { user, profile, updateProfileData } = useAuth()
  const [theme, setTheme] = useState(getInitialTheme)

  // Apply the "dark" class and remember it on this device.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // When the saved profile arrives (after login or reload), adopt its theme.
  // This is what carries the choice to a new device.
  const savedTheme = profile?.theme
  useEffect(() => {
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme)
  }, [savedTheme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme: () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next) // instant, and saved to localStorage by the effect above
        // Also save to the profile doc when logged in. A failed sync must not break the toggle.
        if (user) updateProfileData({ theme: next }).catch(() => {})
      },
    }),
    [theme, user, updateProfileData]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}