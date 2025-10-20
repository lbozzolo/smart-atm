'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPagination, type CallWithPCAInfo, type PaginationParams } from '@/lib/supabase'
import AnalysisModal from './AnalysisModal'

interface TableFilters {
  search: string
  status: string
  hasPCA: string
  dateFrom: string
  dateTo: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function ModernCallsTable() {
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  
  // Estados para paginación del servidor
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    status: 'all',
    hasPCA: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'business_name',
    sortOrder: 'desc'
  })

  useEffect(() => {
    fetchCalls()
  }, [currentPage, itemsPerPage, filters])

  const fetchCalls = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const paginationParams: PaginationParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filters: {
          hasPCA: filters.hasPCA === 'all' ? undefined : filters.hasPCA === 'with'
        }
      }
      
      const response = await getCallsWithPagination(paginationParams)
      
      setCalls(response.data)
      setTotalItems(response.total)
      setTotalPages(response.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setCalls([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleViewAnalysis = (callId: string) => {
    setSelectedCallId(callId)
    setIsAnalysisModalOpen(true)
  }

  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false)
    setSelectedCallId(null)
  }

  const handleFilterChange = (key: keyof TableFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({ 
        ...prev, 
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
      }))
    } else {
      setFilters(prev => ({ 
        ...prev, 
        sortBy: column, 
        sortOrder: 'desc' 
      }))
    }
  }

  // Los datos ya vienen filtrados y ordenados del servidor
  // No necesitamos lógica de filtrado del lado del cliente

  // Server-side pagination - los datos ya vienen paginados
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCalls = calls // Los datos ya vienen filtrados y paginados del servidor

  const getStatusBadge = (disposition?: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    
    switch (disposition?.toLowerCase()) {
      // Dispositions positivos (verde)
      case 'new_lead':
      case 'interested':
      case 'successful':
      case 'success':
      case 'sale':
      case 'converted':
        return `${baseClasses} bg-green-100 text-green-800`
      
      // Dispositions de seguimiento (azul)
      case 'callback':
      case 'follow_up':
      case 'scheduled':
      case 'reschedule':
        return `${baseClasses} bg-blue-100 text-blue-800`
      
      // Dispositions de no contacto (amarillo)
      case 'owner_not_present':
      case 'no_answer':
      case 'busy':
      case 'unavailable':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      
      // Dispositions negativos (rojo)
      case 'not_interested':
      case 'failed':
      case 'failure':
      case 'rejected':
      case 'wrong_number':
        return `${baseClasses} bg-red-100 text-red-800`
      
      // Dispositions pendientes (púrpura)
      case 'pending':
      case 'in_progress':
      case 'processing':
        return `${baseClasses} bg-purple-100 text-purple-800`
      
      // Default (gris)
      default:
        return `${baseClasses} bg-slate-100 text-slate-600`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-600">Cargando llamadas...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-red-800 font-semibold text-lg mb-2">Error al cargar las llamadas</h3>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Table Header with Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-slate-800">Tabla de Llamadas</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {totalItems.toLocaleString()} registros
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <input
                type="text"
                placeholder="Buscar por empresa, propietario, teléfono..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
              />
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                🔍 Filtros
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="successful">Exitosas</option>
                  <option value="failed">Fallidas</option>
                  <option value="pending">Pendientes</option>
                </select>
                
                <select
                  value={filters.hasPCA}
                  onChange={(e) => handleFilterChange('hasPCA', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                >
                  <option value="all">Todos (con/sin análisis)</option>
                  <option value="with">Solo con análisis</option>
                  <option value="without">Solo sin análisis</option>
                </select>
                
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  placeholder="Desde"
                />
                
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  placeholder="Hasta"
                />
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      search: '',
                      status: 'all',
                      hasPCA: 'all',
                      dateFrom: '',
                      dateTo: '',
                      sortBy: 'business_name',
                      sortOrder: 'desc'
                    })
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('business_name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Empresa</span>
                    {filters.sortBy === 'business_name' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('owner_name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Propietario</span>
                    {filters.sortBy === 'owner_name' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('disposition')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Disposición</span>
                    {filters.sortBy === 'disposition' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('agreed_amount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Monto</span>
                    {filters.sortBy === 'agreed_amount' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginatedCalls.map((call, index) => (
                <tr 
                  key={call.call_id} 
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{call.business_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{call.owner_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-slate-500">{call.owner_phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{call.owner_email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(call.disposition)}>
                      {call.disposition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      {call.agreed_amount ? `$${call.agreed_amount.toLocaleString()}` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {call.hasPCA && (
                      <button
                        onClick={() => handleViewAnalysis(call.call_id)}
                        className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        Análisis
                        <span className="ml-1 w-2 h-2 bg-purple-500 rounded-full"></span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} registros
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Anterior
                </button>
                
                <span className="text-sm text-slate-600">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Análisis */}
      {selectedCallId && (
        <AnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={closeAnalysisModal}
          callId={selectedCallId}
        />
      )}
    </div>
  )
}