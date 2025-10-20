'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SidebarProps {
  activeItem?: string
}

export default function Sidebar({ activeItem = 'dashboard' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      href: '/',
      description: 'Vista general'
    },
    {
      id: 'calls',
      name: 'Llamadas',
      icon: '📞',
      href: '/calls',
      description: 'Gestión de llamadas'
    },
    {
      id: 'leads',
      name: 'Leads',
      icon: '�',
      href: '/leads',
      description: 'Prospectos y seguimiento'
    },
    {
      id: 'analytics',
      name: 'Análisis',
      icon: '�',
      href: '/analytics',
      description: 'Métricas y reportes'
    },
    {
      id: 'settings',
      name: 'Configuración',
      icon: '⚙️',
      href: '/settings',
      description: 'Ajustes del sistema'
    }
  ]

  return (
    <div className={`
      fixed left-0 top-0 h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
      border-r border-slate-700/50 backdrop-blur-xl transition-all duration-300 ease-in-out z-30
      ${isCollapsed ? 'w-20' : 'w-64'}
    `}>
      {/* Header del Sidebar */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/30">
        <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">SA</span>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-white font-bold text-xl">Smart ATM</h1>
              <p className="text-slate-400 text-xs">Call Management</p>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/30 transition-colors"
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
                flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group
                ${activeItem === item.id 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-white shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                }
              `}
            >
              <span className={`text-xl ${activeItem === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {item.icon}
              </span>
              
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              )}
              
              {activeItem === item.id && !isCollapsed && (
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Status Card */}
      {!isCollapsed && (
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <div className="text-white text-sm font-medium">Sistema Activo</div>
                <div className="text-green-300 text-xs">Todos los servicios operativos</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}