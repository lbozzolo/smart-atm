'use client'

import { useTheme, themes } from '@/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const currentTheme = themes[theme]

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 px-3 py-2 rounded-theme transition-all duration-200 
                 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border
                 hover:border-theme-border-hover text-theme-text-secondary hover:text-theme-primary"
      title={`Cambiar a ${theme === 'default' ? 'tema cálido' : 'tema por defecto'}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
      </svg>
      <span className="text-sm font-medium">{currentTheme.name}</span>
      
      {/* Indicador visual de los colores del tema */}
      <div className="flex space-x-1">
        <div 
          className="w-3 h-3 rounded-full border border-theme-border"
          style={{ backgroundColor: currentTheme.colors.primary }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-theme-border"
          style={{ backgroundColor: currentTheme.colors.accent }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-theme-border"
          style={{ backgroundColor: currentTheme.colors.secondary }}
        />
      </div>
    </button>
  )
}