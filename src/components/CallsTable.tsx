'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPCAInfo, type CallWithPCAInfo } from '@/lib/supabase'
import CallbacksModal from './CallbacksModal'
import AnalysisModal from './AnalysisModal'

export default function CallsTable() {
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [isCallbacksModalOpen, setIsCallbacksModalOpen] = useState(false)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)

  useEffect(() => {
    async function fetchCalls() {
      try {
        setLoading(true)
        const data = await getCallsWithPCAInfo()
        setCalls(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [])

  const handleViewCallbacks = (callId: string) => {
    setSelectedCallId(callId)
    setIsCallbacksModalOpen(true)
  }

  const handleViewAnalysis = (callId: string) => {
    setSelectedCallId(callId)
    setIsAnalysisModalOpen(true)
  }

  const closeCallbacksModal = () => {
    setIsCallbacksModalOpen(false)
    setSelectedCallId(null)
  }

  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false)
    setSelectedCallId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando llamadas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <p className="text-red-800">Error al cargar las llamadas: {error}</p>
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 m-4 text-center">
        <p className="text-gray-600">No hay llamadas registradas</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Registro de Llamadas</h2>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Llamada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disposición
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-theme-surface-hover">
                  <div className="flex items-center space-x-1"><span>Duración</span></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.call_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {call.call_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.agent_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.business_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.owner_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.owner_phone || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      call.disposition === 'successful' 
                        ? 'bg-green-100 text-green-800' 
                        : call.disposition === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {call.disposition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-theme-text-primary">
                       {(() => {
                         const durationMs = call.duration_ms || 0;
                         const minutes = durationMs ? Math.round(durationMs / 1000 / 60) : 0;
                         return minutes > 0 ? `${minutes} min` : 'N/A';
                       })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleViewCallbacks(call.call_id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Ver Callbacks
                    </button>
                    {call.hasPCA && (
                      <button
                        onClick={() => handleViewAnalysis(call.call_id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        Ver Análisis
                      </button>
                    )}
                    {!call.hasPCA && (
                      <span className="inline-flex items-center px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
                        Sin análisis
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-3">
          <p className="text-sm text-gray-700">
            Total de llamadas: <span className="font-medium">{calls.length}</span>
          </p>
        </div>
      </div>

      {/* Modales */}
      {selectedCallId && (
        <>
          <CallbacksModal
            isOpen={isCallbacksModalOpen}
            onClose={closeCallbacksModal}
            callId={selectedCallId}
          />
          <AnalysisModal
            isOpen={isAnalysisModalOpen}
            onClose={closeAnalysisModal}
            callId={selectedCallId}
          />
        </>
      )}
    </div>
  )
}