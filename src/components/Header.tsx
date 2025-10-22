'use client'

import { useAuth } from '@/components/ProtectedRoute'
import ThemeToggle from '@/components/ThemeToggle'

interface HeaderProps {
  sidebarCollapsed: boolean
  currentPage?: string
  pageTitle?: string
}

export default function Header({ sidebarCollapsed, currentPage = 'Dashboard', pageTitle = 'Llamadas' }: HeaderProps) {
  const { user, signOut } = useAuth()

  return (
    <header className={`
      fixed top-0 right-0 h-16 bg-theme-surface/80 backdrop-blur-xl border-b border-theme-border/50 
      transition-all duration-300 z-20 shadow-sm
      ${sidebarCollapsed ? 'left-20' : 'left-64'}
    `}>
      <div className="flex items-center justify-between h-full px-6">
        
        {/* Breadcrumb & Title */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-theme-text-secondary">
            <span className="text-theme-text-muted">Smart ATM</span>
            <span className="mx-2">/</span>
            <span className="text-theme-text-secondary font-medium">{currentPage}</span>
            {pageTitle && currentPage !== pageTitle && (
              <>
                <span className="mx-2">/</span>
                <span className="text-theme-text-primary font-semibold">{pageTitle}</span>
              </>
            )}
          </div>
        </div>

        {/* User Info & Controls */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {user && (
            <>
              <div className="text-sm text-theme-text-secondary">
                <span className="text-theme-text-muted">Usuario:</span>
                <span className="ml-2 font-medium text-theme-text-primary">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-theme-text-secondary hover:text-theme-error hover:bg-theme-error/10 rounded-theme transition-colors duration-200"
                title="Cerrar Sesión"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Salir</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}