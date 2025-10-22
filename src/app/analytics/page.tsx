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
            <div className="flex justify-center mb-4">
              <svg className="w-24 h-24 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Análisis y Reportes</h1>
            <p className="text-slate-600 mb-8">Esta sección estará disponible próximamente</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Gráficos de Rendimiento</h3>
                <p className="text-slate-600 text-sm">Visualiza las métricas de llamadas en tiempo real</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Reportes Detallados</h3>
                <p className="text-slate-600 text-sm">Genera reportes personalizados por período</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
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