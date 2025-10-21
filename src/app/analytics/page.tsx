'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AnalyticsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <Sidebar activeItem="analytics" />
      
      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Análisis" pageTitle="Métricas y Reportes" />
      
      {/* Main Content */}
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📈</div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Análisis y Reportes</h1>
            <p className="text-slate-600 mb-8">Esta sección estará disponible próximamente</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-semibold text-slate-800 mb-2">Gráficos de Rendimiento</h3>
                <p className="text-slate-600 text-sm">Visualiza las métricas de llamadas en tiempo real</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-semibold text-slate-800 mb-2">Reportes Detallados</h3>
                <p className="text-slate-600 text-sm">Genera reportes personalizados por período</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold text-slate-800 mb-2">KPIs y Objetivos</h3>
                <p className="text-slate-600 text-sm">Monitorea el cumplimiento de objetivos</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}