'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <Sidebar activeItem="settings" />
      
      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Configuración" pageTitle="Ajustes del Sistema" />
      
      {/* Main Content */}
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚙️</div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Configuración del Sistema</h1>
            <p className="text-slate-600 mb-8">Ajusta las preferencias y configuración de Smart ATM</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">👤</div>
                <h3 className="font-semibold text-slate-800 mb-2">Perfil de Usuario</h3>
                <p className="text-slate-600 text-sm">Gestiona tu información personal</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">🔔</div>
                <h3 className="font-semibold text-slate-800 mb-2">Notificaciones</h3>
                <p className="text-slate-600 text-sm">Configura alertas y recordatorios</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="font-semibold text-slate-800 mb-2">Apariencia</h3>
                <p className="text-slate-600 text-sm">Personaliza el tema y diseño</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">🔐</div>
                <h3 className="font-semibold text-slate-800 mb-2">Seguridad</h3>
                <p className="text-slate-600 text-sm">Configuración de acceso y permisos</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">🌐</div>
                <h3 className="font-semibold text-slate-800 mb-2">API & Conexiones</h3>
                <p className="text-slate-600 text-sm">Gestiona integraciones externas</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-semibold text-slate-800 mb-2">Base de Datos</h3>
                <p className="text-slate-600 text-sm">Configuración de Supabase</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}