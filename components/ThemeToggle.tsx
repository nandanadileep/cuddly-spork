'use client'

import { useEffect, useState } from 'react'
import { MdDarkMode, MdLightMode } from 'react-icons/md'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'shipcv_theme'

const getPreferredTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (mode: ThemeMode) => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.style.colorScheme = mode
}

export default function ThemeToggle({
    className = '',
    showLabel = false,
}: {
    className?: string
    showLabel?: boolean
}) {
    const [theme, setTheme] = useState<ThemeMode>('light')

    useEffect(() => {
        const preferred = getPreferredTheme()
        setTheme(preferred)
        applyTheme(preferred)
    }, [])

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        localStorage.setItem(STORAGE_KEY, next)
        applyTheme(next)
    }

    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-warm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ${className}`}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
            {isDark ? <MdLightMode className="text-lg" /> : <MdDarkMode className="text-lg" />}
            {showLabel && <span className="text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>}
        </button>
    )
}
