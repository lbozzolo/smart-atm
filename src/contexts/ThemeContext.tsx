'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Theme = 'default' | 'warm'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const themes = {
  default: {
    name: 'Tema por Defecto',
    colors: {
      // Grises y azules actuales
      primary: '#3b82f6',      // blue-500
      primaryDark: '#1d4ed8',  // blue-700
      primaryLight: '#93c5fd', // blue-300
      
      secondary: '#64748b',    // slate-500
      secondaryDark: '#334155', // slate-700
      secondaryLight: '#cbd5e1', // slate-300
      
      accent: '#8b5cf6',       // violet-500
      accentDark: '#7c3aed',   // violet-600
      accentLight: '#c4b5fd',  // violet-300
      
      success: '#10b981',      // emerald-500
      warning: '#f59e0b',      // amber-500
      error: '#ef4444',        // red-500
      
      background: '#f8fafc',   // slate-50
      surface: '#ffffff',      // white
      surfaceHover: '#f1f5f9', // slate-100
      
      textPrimary: '#0f172a',  // slate-900
      textSecondary: '#475569', // slate-600
      textMuted: '#94a3b8',    // slate-400
      
      border: '#e2e8f0',       // slate-200
      borderHover: '#cbd5e1',  // slate-300
    }
  },
  warm: {
    name: 'Tema Cálido',
    colors: {
      // Tu nueva paleta cálida
      primary: '#BF4A30',      // Rojo cálido principal
      primaryDark: '#590902',  // Rojo muy oscuro
      primaryLight: '#D9AB91', // Beige rosado
      
      secondary: '#590902',    // Rojo oscuro para elementos secundarios
      secondaryDark: '#260101', // Rojo casi negro
      secondaryLight: '#E7E0D5', // Beige muy claro
      
      accent: '#D9AB91',       // Beige rosado para acentos
      accentDark: '#BF4A30',   // Rojo cálido
      accentLight: '#E7E0D5',  // Beige muy claro
      
      success: '#228B22',      // Verde que combina con cálidos
      warning: '#FF8C00',      // Naranja cálido
      error: '#BF4A30',        // Usar el rojo principal para errores
      
      background: '#E7E0D5',   // Beige muy claro como fondo
      surface: '#F5F1EB',      // Beige aún más claro para superficies (antes era surfaceHover)
      surfaceHover: '#EAE4D8', // Beige intermedio para hover
      
      textPrimary: '#260101',  // Rojo casi negro para texto principal
      textSecondary: '#590902', // Rojo oscuro para texto secundario
      textMuted: '#8B7355',    // Marrón medio para texto muted
      
      border: '#D9AB91',       // Beige rosado para bordes
      borderHover: '#BF4A30',  // Rojo cálido para bordes hover
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('default')

  // Cargar tema desde localStorage al inicializar
  useEffect(() => {
    const savedTheme = localStorage.getItem('smart-atm-theme') as Theme
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme)
    }
  }, [])

  // Aplicar CSS custom properties cuando cambie el tema
  useEffect(() => {
    const root = document.documentElement
    const themeColors = themes[theme].colors

    // Aplicar todas las variables CSS
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // Guardar en localStorage
    localStorage.setItem('smart-atm-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(current => current === 'default' ? 'warm' : 'default')
  }

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}