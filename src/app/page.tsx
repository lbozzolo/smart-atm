
'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MetricsSection from '@/components/MetricsSection'
import ModernCallsTable from '@/components/ModernCallsTable'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-theme-background">
        {/* Sidebar */}
        <Sidebar activeItem="calls" />
        
        {/* Header */}
        <Header sidebarCollapsed={sidebarCollapsed} currentPage="Llamadas" pageTitle="Gestión de Llamadas" />
        
        {/* Main Content */}
        <main className={`
          pt-20 pb-8 px-6 transition-all duration-300
          ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
        `}>
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
                    Dashboard de Llamadas
                  </h1>
                  <p className="text-theme-text-secondary">
                    Gestiona y analiza todas las llamadas del sistema Smart ATM
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Section */}
            <MetricsSection />

            {/* Calls Table */}
            <ModernCallsTable />
          
          {/* Footer */}
          <footer className="text-center py-8 border-t border-theme-border bg-theme-surface rounded-theme-lg">
            <div className="flex items-center justify-center space-x-6 text-theme-text-muted">
              <span>© 2025 Smart ATM</span>
              <span>•</span>
              <span>Sistema de Gestión de Llamadas</span>
              <span>•</span>
              <span className="text-theme-success flex items-center">
                <div className="w-2 h-2 bg-theme-success rounded-full mr-2 animate-pulse"></div>
                Sistema Operativo
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
