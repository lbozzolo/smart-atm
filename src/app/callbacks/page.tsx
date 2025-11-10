'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ProtectedRoute from '@/components/ProtectedRoute'
import CallbacksList from '@/components/CallbacksList'

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
          
          <div className="py-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Gestión de Callbacks</h1>
            <p className="text-slate-600 mb-6">Administra las llamadas programadas y pendientes</p>

            <CallbacksList />
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}