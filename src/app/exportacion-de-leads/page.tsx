"use client"

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ExportSection from '@/components/ExportSection'

export default function ExportPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Sidebar activeItem="exportacion" />

        <Header sidebarCollapsed={sidebarCollapsed} currentPage="Exportación" pageTitle="Exportación de datos" />

        <main className={`pt-20 pb-8 px-6 transition-all duration-300 ml-[32rem]`}>
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-slate-800 mb-4">Exportación</h1>
              <p className="text-slate-600 mb-6">Prepara y exporta consultas en CSV</p>
              <ExportSection />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
