'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SidebarProps {
  activeItem?: string
}

export default function Sidebar({ activeItem = 'calls' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const configItems = [
    {
      id: 'importacion',
      name: 'Importación',
      href: '/importacion',
      description: 'Importar datos'
    },
    {
      id: 'exportacion',
      name: 'Exportación',
      href: '/exportacion-de-leads',
      description: 'Exportar datos'
    },
    {
      id: 'facturacion',
      name: 'Facturación',
      href: '/facturacion',
      description: 'Historial de costos'
    },
    {
      id: 'profile',
      name: 'Perfil',
      href: '/profile',
      description: 'Configuración de cuenta'
    }
  ]

  const isConfigActive = configItems.some(item => item.id === activeItem)

  const menuItems = [
    {
      id: 'calls',
      name: 'Llamadas',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>phone-call-loop</title>
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path strokeDasharray="64" strokeDashoffset="64" d="M8 3c0.5 0 2.5 4.5 2.5 5c0 1 -1.5 2 -2 3c-0.5 1 0.5 2 1.5 3c0.39 0.39 2 2 3 1.5c1 -0.5 2 -2 3 -2c0.5 0 5 2 5 2.5c0 2 -1.5 3.5 -3 4c-1.5 0.5 -2.5 0.5 -4.5 0c-2 -0.5 -3.5 -1 -6 -3.5c-2.5 -2.5 -3 -4 -3.5 -6c-0.5 -2 -0.5 -3 0 -4.5c0.5 -1.5 2 -3 4 -3Z">
              <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/>
              <animateTransform id="SVG3Jm2WHSS" fill="freeze" attributeName="transform" begin="0.6s;SVG3Jm2WHSS.begin+2.7s" dur="0.5s" type="rotate" values="0 12 12;15 12 12;0 12 12;-12 12 12;0 12 12;12 12 12;0 12 12;-15 12 12;0 12 12"/>
            </path>
            <path strokeDasharray="4" strokeDashoffset="4" d="M15.76 8.28c-0.5 -0.51 -1.1 -0.93 -1.76 -1.24M15.76 8.28c0.49 0.49 0.9 1.08 1.2 1.72">
              <animate fill="freeze" attributeName="stroke-dashoffset" begin="SVG3Jm2WHSS.begin+0s" dur="2.7s" keyTimes="0;0.111;0.259;0.37;1" values="4;0;0;4;4"/>
            </path>
            <path strokeDasharray="6" strokeDashoffset="6" d="M18.67 5.35c-1 -1 -2.26 -1.73 -3.67 -2.1M18.67 5.35c0.99 1 1.72 2.25 2.08 3.65">
              <animate fill="freeze" attributeName="stroke-dashoffset" begin="SVG3Jm2WHSS.begin+0.2s" dur="2.7s" keyTimes="0;0.074;0.185;0.333;0.444;1" values="6;6;0;0;6;6"/>
            </path>
          </g>
        </svg>
      ),
      href: '/',
      description: 'Gestión de llamadas'
    },
    {
      id: 'callbacks',
      name: 'Callbacks',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>calendar</title><rect width="14" height="0" x="5" y="5" fill="currentColor"><animate fill="freeze" attributeName="height" begin="0.6s" dur="0.2s" values="0;3"/></rect><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path strokeDasharray="64" strokeDashoffset="64" d="M12 4h7c0.55 0 1 0.45 1 1v14c0 0.55 -0.45 1 -1 1h-14c-0.55 0 -1 -0.45 -1 -1v-14c0 -0.55 0.45 -1 1 -1Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"/></path><path strokeDasharray="4" strokeDashoffset="4" d="M7 4v-2M17 4v-2"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="4;0"/></path><path strokeDasharray="12" strokeDashoffset="12" d="M7 11h10"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="12;0"/></path><path strokeDasharray="8" strokeDashoffset="8" d="M7 15h7"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1s" dur="0.2s" values="8;0"/></path></g></svg>
      ),
      href: '/callbacks',
      description: 'Llamadas programadas'
    },
    {
      id: 'clientes',
      name: 'Clientes',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>account</title><g fill="none" stroke="currentColor" strokeDasharray="28" strokeDashoffset="28" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M4 21v-1c0 -3.31 2.69 -6 6 -6h4c3.31 0 6 2.69 6 6v1"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="28;0"/></path><path d="M12 11c-2.21 0 -4 -1.79 -4 -4c0 -2.21 1.79 -4 4 -4c2.21 0 4 1.79 4 4c0 2.21 -1.79 4 -4 4Z"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="28;0"/></path></g></svg>
      ),
      href: '/clientes',
      description: 'Listado de clientes'
    },
    {
      id: 'configuracion',
      name: 'Configuración',
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>cog</title><defs><symbol id="SVGf9bFLczd"><path d="M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.6 7.4 16.8 7.61 16.99 7.83C17.46 8.4 17.85 9.05 18.11 9.77C18.2 10.03 18.28 10.31 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12"><animate fill="freeze" attributeName="d" begin="0.9s" dur="0.2s" values="M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.6 7.4 16.8 7.61 16.99 7.83C17.46 8.4 17.85 9.05 18.11 9.77C18.2 10.03 18.28 10.31 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12;M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.38 7.2 19 6.12 19.01 6.14C19.01 6.14 20.57 8.84 20.57 8.84C20.58 8.87 18.35 10.59 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12"/></path></symbol></defs><g fill="none" stroke="currentColor" strokeWidth="2"><g strokeLinecap="round"><path strokeDasharray="20" strokeDashoffset="20" d="M12 9c1.66 0 3 1.34 3 3c0 1.66 -1.34 3 -3 3c-1.66 0 -3 -1.34 -3 -3c0 -1.66 1.34 -3 3 -3Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"/></path><path strokeDasharray="48" strokeDashoffset="48" d="M12 5.5c3.59 0 6.5 2.91 6.5 6.5c0 3.59 -2.91 6.5 -6.5 6.5c-3.59 0 -6.5 -2.91 -6.5 -6.5c0 -3.59 2.91 -6.5 6.5 -6.5Z"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.6s" values="48;0"/><set fill="freeze" attributeName="opacity" begin="0.9s" to="0"/></path></g><g opacity="0"><use href="#SVGf9bFLczd"/><use href="#SVGf9bFLczd" transform="rotate(60 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(120 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(180 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(240 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(300 12 12)"/><set fill="freeze" attributeName="opacity" begin="0.9s" to="1"/></g></g></svg>
      ),
      href: '/importacion', // Default to importacion
      description: 'Ajustes del sistema'
    }
  ]

  return (
    <>
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
            {menuItems.map((item) => {
              const isActive = item.id === activeItem || (item.id === 'configuracion' && isConfigActive)
              
              const className = `
                  flex items-center space-x-3 p-3 rounded-theme transition-all duration-200 group
                  ${isActive
                    ? 'bg-theme-primary text-white shadow-lg' 
                    : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface-hover'
                  }
                `

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={className}
                >
                  <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Secondary Sidebar for Configuration */}
      {isConfigActive && (
        <div className={`
          fixed top-0 h-full bg-theme-surface/50 backdrop-blur-md
          border-r border-theme-border transition-all duration-300 ease-in-out z-20
          w-64 pt-16
        `}
        style={{ left: isCollapsed ? '5rem' : '16rem' }}
        >
          <div className="p-6 border-b border-theme-border/30 h-[89px] flex items-center">
            <h2 className="text-lg font-bold text-theme-text-primary">Configuración</h2>
          </div>
          <nav className="mt-8 px-4">
            <div className="space-y-2">
              {configItems.map((item) => {
                const isActive = item.id === activeItem
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`
                      block p-3 rounded-theme transition-all duration-200
                      ${isActive
                        ? 'bg-theme-surface-hover text-theme-primary font-medium' 
                        : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface-hover'
                      }
                    `}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}