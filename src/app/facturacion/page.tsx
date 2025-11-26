'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ProtectedRoute from '@/components/ProtectedRoute'
import BillingTable from '@/components/BillingTable'

export default function FacturacionPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-theme-background">
        {/* Sidebar */}
        <Sidebar activeItem="facturacion" />
        
        {/* Header */}
        <Header sidebarCollapsed={sidebarCollapsed} currentPage="Facturación" pageTitle="Historial de Facturación" />
        
        {/* Main Content */}
        <main className={`
          pt-20 pb-8 px-6 transition-all duration-300
          ml-[32rem]
        `}>
          <div className="w-full max-w-5xl mx-auto space-y-8">
            
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
                Facturación
              </h1>
              <p className="text-theme-text-secondary">
                Resumen mensual de consumo y costos
              </p>
            </div>

            <BillingTable />
            
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
