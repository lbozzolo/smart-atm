'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function CallbacksPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <Sidebar activeItem="callbacks" />
      
      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Callbacks" pageTitle="Llamadas Pendientes" />
      
      {/* Main Content */}
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔄</div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Gestión de Callbacks</h1>
            <p className="text-slate-600 mb-8">Administra las llamadas programadas y pendientes</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="font-semibold text-slate-800 mb-2">Callbacks Programados</h3>
                <p className="text-slate-600 text-sm">Visualiza y gestiona las llamadas programadas</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">⏰</div>
                <h3 className="font-semibold text-slate-800 mb-2">Recordatorios</h3>
                <p className="text-slate-600 text-sm">Sistema de notificaciones automáticas</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}