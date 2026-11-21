import { createContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export const ThemeContext = createContext(null)

const STORAGE_KEY = 'theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const { user, profile, updateProfileData } = useAuth()
  const [theme, setTheme] = useState(getInitialTheme)


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])


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
        setTheme(next) 
       
        if (user) updateProfileData({ theme: next }).catch(() => {})
      },
    }),
    [theme, user, updateProfileData]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}