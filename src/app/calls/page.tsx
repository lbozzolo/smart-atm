'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ModernCallsTable from '@/components/ModernCallsTable'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function CallsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <Sidebar activeItem="calls" />
      
      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Llamadas" pageTitle="Gestión" />
      
      {/* Main Content */}
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  📞 Gestión de Llamadas
                </h1>
                <p className="text-slate-600">
                  Administra y visualiza todas las llamadas del sistema
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
                  📥 Importar Llamadas
                </button>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl">
                  📊 Exportar Datos
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📞</span>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Llamadas Hoy</p>
                  <p className="text-slate-800 font-bold text-lg">24</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-green-600 text-lg">✅</span>
                </div>
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

          {/* Calls Table */}
          <ModernCallsTable />
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}