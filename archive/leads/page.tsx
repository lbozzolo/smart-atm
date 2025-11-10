'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import LeadsTable from '@/components/LeadsTable'
import AnalysisModal from '@/components/AnalysisModal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Call } from '@/lib/supabase'

export default function LeadsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)

  const handleCallSelect = (call: Call) => {
    setSelectedCall(call)
    setIsAnalysisModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAnalysisModalOpen(false)
    setSelectedCall(null)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar */}
      <Sidebar activeItem="leads" />
      
      {/* Header */}
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Leads" pageTitle="Gestión de Prospectos" />
      
      {/* Main Content */}
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="max-w-7xl mx-auto">
          <LeadsTable onCallSelect={handleCallSelect} />
        </div>
      </main>
      
      {/* Modal */}
      {selectedCall && (
        <AnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={handleCloseModal}
          callId={selectedCall.call_id}
        />
      )}
    </div>
    </ProtectedRoute>
  )
}
