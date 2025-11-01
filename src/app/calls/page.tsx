'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ModernCallsTable from '@/components/ModernCallsTable'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function CallsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-theme-surface">
        <Sidebar activeItem="calls" />
      <main className="ml-64 px-0">
          <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-theme-border pb-6 mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-theme-text-primary">📞 Gestión de Llamadas</h1>
                <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">Acciones rápidas</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  className="inline-flex items-center gap-2 px-2 py-1 text-sm border border-theme-border rounded-theme bg-theme-surface hover:bg-theme-surface-hover text-theme-text-primary"
                  onClick={() => setShowMetrics((prev) => !prev)}
                >
                  {showMetrics ? 'Ocultar métricas' : 'Mostrar métricas'}
                </button>
                <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-theme hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
                  📥 Importar Llamadas
                </button>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-theme hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl">
                  📊 Exportar Datos
                </button>
              </div>
            </div>
            {/* botón movido arriba, junto a acciones */}
            {/* Métricas */}
            {showMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 w-full">
                {/* Métricas rápidas */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📞</span>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Total llamadas</p>
                      <p className="text-slate-800 font-bold text-lg">24</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600 text-lg">✅</span>
                    <div>
                      <p className="text-slate-500 text-sm">Exitosas</p>
                      <p className="text-slate-800 font-bold text-lg">18</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-purple-600 text-lg">📊</span>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Con Análisis</p>
                      <p className="text-slate-800 font-bold text-lg">15</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <span className="text-orange-600 text-lg">⏱️</span>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Pendientes</p>
                      <p className="text-slate-800 font-bold text-lg">6</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto w-full pb-6">
              <ModernCallsTable />
            </div>
          </div>
      </main>
      </div>
    </ProtectedRoute>
  )
}