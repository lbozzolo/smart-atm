'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SidebarProps {
  activeItem?: string
}

export default function Sidebar({ activeItem = 'calls' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    {
      id: 'calls',
      name: 'Llamadas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      href: '/',
      description: 'Gestión de llamadas'
    },
    {
      id: 'callbacks',
      name: 'Callbacks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      href: '/callbacks',
      description: 'Llamadas programadas'
    },
    {
      id: 'clientes',
      name: 'Clientes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9.001 9.001 0 0112 15c2.21 0 4.21.805 5.879 2.146M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: '/clientes',
      description: 'Listado de clientes'
    },
    {
      id: 'importacion',
      name: 'Importación',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h8a2 2 0 002-2v-2M9 12V4m6 8V4m-6 8l3 3m0 0l3-3" />
        </svg>
      ),
      href: '/importacion',
      description: 'Importar datos a la base'
    }
  ]

  return (
    <div className={`
      fixed left-0 top-0 h-full bg-theme-surface
      border-r border-theme-border backdrop-blur-xl transition-all duration-300 ease-in-out z-30
      ${isCollapsed ? 'w-20' : 'w-64'}
    `}>
      {/* Header del Sidebar */}
      <div className="flex items-center justify-between p-6 border-b border-theme-border/30">
        <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-theme-primary rounded-theme flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">SA</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-theme-text-primary font-bold text-xl">Smart ATM</h1>
                <p className="text-theme-text-muted text-xs">Call Management</p>
              </div>
            )}
          </Link>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-theme-text-muted hover:text-theme-text-primary p-1 rounded-lg hover:bg-theme-surface-hover transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center space-x-3 p-3 rounded-theme transition-all duration-200 group
                ${activeItem === item.id 
                  ? 'bg-theme-primary text-white shadow-lg' 
                  : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface-hover'
                }
              `}
            >
              <div className={`${activeItem === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {item.icon}
              </div>
              
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              )}
              
              {activeItem === item.id && !isCollapsed && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          ))}
        </div>
      </nav>


    </div>
  )
}