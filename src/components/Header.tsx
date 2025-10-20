'use client'

interface HeaderProps {
  sidebarCollapsed: boolean
  currentPage?: string
  pageTitle?: string
}

export default function Header({ sidebarCollapsed, currentPage = 'Dashboard', pageTitle = 'Llamadas' }: HeaderProps) {
  
  return (
    <header className={`
      fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 
      transition-all duration-300 z-20 shadow-sm
      ${sidebarCollapsed ? 'left-20' : 'left-64'}
    `}>
      <div className="flex items-center justify-between h-full px-6">
        
        {/* Breadcrumb & Title */}
        <div className="flex items-center space-x-4">
          <div className="text-slate-600 text-sm">
            <span className="text-slate-400">Smart ATM</span>
            <span className="mx-2">/</span>
            <span className="text-slate-700 font-medium">{currentPage}</span>
            {pageTitle && currentPage !== pageTitle && (
              <>
                <span className="mx-2">/</span>
                <span className="text-slate-800 font-semibold">{pageTitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Spacer para mantener el breadcrumb centrado */}
        <div></div>
      </div>
    </header>
  )
}