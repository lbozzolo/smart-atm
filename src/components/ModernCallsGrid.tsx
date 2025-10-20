'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPCAInfo, type CallWithPCAInfo } from '@/lib/supabase'
import CallbacksModal from './CallbacksModal'
import AnalysisModal from './AnalysisModal'

interface CallCardProps {
  call: CallWithPCAInfo
  onViewCallbacks: (callId: string) => void
  onViewAnalysis: (callId: string) => void
}

function CallCard({ call, onViewCallbacks, onViewAnalysis }: CallCardProps) {
  const getStatusColor = (disposition?: string) => {
    switch (disposition?.toLowerCase()) {
      case 'successful':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const formatCallId = (callId: string) => {
    if (callId.startsWith('call_')) {
      return callId.replace('call_', '').substring(0, 8) + '...'
    }
    return callId.substring(0, 12) + '...'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center text-white font-bold">
            {call.agent_name?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">{call.business_name || 'Empresa no especificada'}</h3>
            <p className="text-slate-500 text-sm font-mono">{formatCallId(call.call_id)}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(call.disposition)}`}>
          {call.disposition || 'Sin estado'}
        </div>
      </div>

      {/* Información Principal */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Agente</label>
            <p className="text-slate-800 font-medium">{call.agent_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Propietario</label>
            <p className="text-slate-800">{call.owner_name || 'N/A'}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Teléfono</label>
            <p className="text-slate-800 font-mono">{call.owner_phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
            <p className="text-slate-800 text-sm truncate">{call.owner_email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Monto Acordado */}
      {call.agreed_amount && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-green-700 font-medium">Monto Acordado</span>
            <span className="text-2xl font-bold text-green-800">
              ${call.agreed_amount.toLocaleString()}
            </span>
          </div>
          {call.monthly_amount && (
            <p className="text-green-600 text-sm mt-1">
              Mensual: ${call.monthly_amount.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Ubicación */}
      {(call.address_street || call.address_city || call.address_state) && (
        <div className="mb-6 p-3 bg-slate-50 rounded-lg">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Ubicación</label>
          <p className="text-slate-700 text-sm">
            {[call.address_street, call.address_city, call.address_state].filter(Boolean).join(', ')}
            {call.address_zip && ` ${call.address_zip}`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
        <button
          onClick={() => onViewCallbacks(call.call_id)}
          className="flex-1 px-4 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm
                   shadow-lg hover:shadow-xl"
        >
          📞 Ver Callbacks
        </button>
        
        {call.hasPCA ? (
          <button
            onClick={() => onViewAnalysis(call.call_id)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium 
                     rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all
                     focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm
                     shadow-lg hover:shadow-xl"
          >
            📊 Ver Análisis
          </button>
        ) : (
          <div className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-500 font-medium rounded-xl text-sm text-center">
            Sin análisis
          </div>
        )}
      </div>

      {/* PCA Indicator */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${call.hasPCA ? 'bg-green-400' : 'bg-slate-300'}`}></div>
          <span className="text-xs text-slate-500">
            {call.hasPCA ? 'Análisis disponible' : 'Sin análisis'}
          </span>
        </div>
        
        <div className="text-xs text-slate-400 font-mono">
          ID: {call.call_id.substring(0, 8)}...
        </div>
      </div>
    </div>
  )
}

export default function ModernCallsGrid() {
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [isCallbacksModalOpen, setIsCallbacksModalOpen] = useState(false)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

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

  // Filtrar llamadas
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.call_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'with-pca' && call.hasPCA) ||
      (filterStatus === 'without-pca' && !call.hasPCA) ||
      call.disposition === filterStatus

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="w-24 h-3 bg-slate-200 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-full h-4 bg-slate-200 rounded"></div>
                <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-red-800 font-semibold text-lg mb-2">Error al cargar las llamadas</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-800">Llamadas Registradas</h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
              {filteredCalls.length} de {calls.length}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <input
              type="text"
              placeholder="Buscar por ID, empresa, agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="all">Todas las llamadas</option>
              <option value="with-pca">Con análisis</option>
              <option value="without-pca">Sin análisis</option>
              <option value="successful">Exitosas</option>
              <option value="failed">Fallidas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCalls.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-slate-400 text-6xl mb-4">📞</div>
          <h3 className="text-slate-600 font-semibold text-lg mb-2">No se encontraron llamadas</h3>
          <p className="text-slate-500">Ajusta los filtros de búsqueda para ver más resultados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalls.map((call) => (
            <CallCard
              key={call.call_id}
              call={call}
              onViewCallbacks={handleViewCallbacks}
              onViewAnalysis={handleViewAnalysis}
            />
          ))}
        </div>
      )}

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