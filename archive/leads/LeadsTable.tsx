'use client'

import { useState, useEffect, useRef } from 'react'
import { Lead, getLeadsWithPagination, getCallHistoryByPhone, Call, CallInteraction, LeadPaginationParams, PaginatedLeadsResult } from '@/lib/supabase'

interface LeadsTableProps {
  onCallSelect?: (call: Call) => void
}

// Estados para filtros
interface TableFilters {
  search: string
  disposition: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  minCalls: number
  hasAgreedAmount: string // 'all' | 'yes' | 'no'
}

export default function LeadsTable({ onCallSelect }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]) // Leads de la página actual
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())
  const [leadHistory, setLeadHistory] = useState<Map<string, CallInteraction[]>>(new Map())
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())
  
  // Estados para paginación del servidor
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  
  // Estados para filtros y búsqueda
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    disposition: 'all',
    sortBy: 'last_call_date',
    sortOrder: 'desc',
    minCalls: 1,
    hasAgreedAmount: 'all'
  })

  useEffect(() => {
    loadLeads()
  }, [currentPage, itemsPerPage, filters])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: LeadPaginationParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filters: {
          disposition: filters.disposition === 'all' ? undefined : filters.disposition,
          minCalls: filters.minCalls > 1 ? filters.minCalls : undefined,
          hasAgreedAmount: filters.hasAgreedAmount === 'all' ? undefined : filters.hasAgreedAmount as 'yes' | 'no'
        }
      }
      
      const result: PaginatedLeadsResult = await getLeadsWithPagination(params)
      
      setLeads(result.leads)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
      setHasNextPage(result.hasNextPage)
      setHasPreviousPage(result.hasPreviousPage)
      
    } catch (err) {
      console.error('Error loading leads:', err)
      setError('Error al cargar los leads')
    } finally {
      setLoading(false)
    }
  }

  // Funciones para manejar filtros
  const handleFilterChange = (key: keyof TableFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset página al cambiar filtros
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
    
    // Debounce para búsqueda
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }))
      setCurrentPage(1) // Reset página al buscar
    }, 300)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      setFilters(prev => ({ ...prev, search: searchInput }))
      setCurrentPage(1) // Reset página al buscar
    }
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
    setCurrentPage(1) // Reset página al cambiar ordenamiento
  }

  const toggleLeadExpansion = async (phoneNumber: string) => {
    const newExpanded = new Set(expandedLeads)
    
    if (expandedLeads.has(phoneNumber)) {
      // Contraer
      newExpanded.delete(phoneNumber)
    } else {
      // Expandir y cargar historial si no está cargado
      newExpanded.add(phoneNumber)
      
      if (!leadHistory.has(phoneNumber)) {
        setLoadingHistory(prev => new Set(prev).add(phoneNumber))
        try {
          const history = await getCallHistoryByPhone(phoneNumber)
          setLeadHistory(prev => new Map(prev).set(phoneNumber, history))
        } catch (err) {
          console.error('Error loading call history:', err)
        } finally {
          setLoadingHistory(prev => {
            const newSet = new Set(prev)
            newSet.delete(phoneNumber)
            return newSet
          })
        }
      }
    }
    
    setExpandedLeads(newExpanded)
  }

  const getDispositionBadge = (disposition?: string) => {
    if (!disposition) {
      return (
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: 'var(--color-surfaceHover)', color: 'var(--color-textMuted)' }}
        >
          Sin disposition
        </span>
      )
    }

    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    let styles = {}
    
    switch (disposition?.toLowerCase()) {
      // Dispositions positivos (verde)
      case 'new_lead':
      case 'interested':
      case 'successful':
      case 'success':
      case 'sale':
      case 'converted':
        styles = { backgroundColor: 'var(--color-success)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions de seguimiento (azul/primary)
      case 'callback':
      case 'follow_up':
      case 'scheduled':
      case 'reschedule':
      case 'voicemail':
        styles = { backgroundColor: 'var(--color-primaryLight)', color: 'var(--color-primaryDark)' }
        break
      
      // Dispositions de no contacto (warning)
      case 'owner_not_present':
      case 'no_answer':
      case 'busy':
      case 'unavailable':
        styles = { backgroundColor: 'var(--color-warning)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions negativos (error)
      case 'not_interested':
      case 'failed':
      case 'failure':
      case 'rejected':
      case 'wrong_number':
        styles = { backgroundColor: 'var(--color-error)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions pendientes (accent)
      case 'pending':
      case 'in_progress':
      case 'processing':
        styles = { backgroundColor: 'var(--color-accentLight)', color: 'var(--color-accentDark)' }
        break
      
      // Default (gris)
      default:
        styles = { backgroundColor: 'var(--color-surfaceHover)', color: 'var(--color-textMuted)' }
        break
    }

    return (
      <span className={baseClasses} style={styles}>
        {disposition}
      </span>
    )
  }

  // Datos para el render
  const displayedLeads = leads // Los leads ya vienen paginados del servidor

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-8 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="ml-4" style={{ color: 'var(--color-textSecondary)' }}>Cargando leads...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-8 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--color-error)' }}>{error}</p>
            <button 
              onClick={loadLeads}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Controls */}
      <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-textPrimary)' }}>Gestión de Leads</h2>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)' + '1A', color: 'var(--color-primary)' }}>
                {totalCount} leads
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por empresa, propietario, teléfono..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm min-w-[300px]"
                  style={{ 
                    backgroundColor: 'var(--color-surface)', 
                    borderColor: 'var(--color-border)', 
                    color: 'var(--color-textPrimary)'
                  } as React.CSSProperties}
                />
                {searchInput !== filters.search && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                  </div>
                )}
              </div>
              
              {/* Botones de ordenamiento rápido */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('last_call_date')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filters.sortBy === 'last_call_date' 
                      ? 'text-white' 
                      : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: filters.sortBy === 'last_call_date' ? 'var(--color-primary)' : 'var(--color-surfaceHover)',
                    color: filters.sortBy === 'last_call_date' ? 'white' : 'var(--color-textPrimary)'
                  }}
                  title="Ordenar por fecha de última llamada"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {filters.sortBy === 'last_call_date' && (
                      <span className="text-xs">{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </button>
                
                <button
                  onClick={() => handleSort('total_calls')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filters.sortBy === 'total_calls' 
                      ? 'text-white' 
                      : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: filters.sortBy === 'total_calls' ? 'var(--color-primary)' : 'var(--color-surfaceHover)',
                    color: filters.sortBy === 'total_calls' ? 'white' : 'var(--color-textPrimary)'
                  }}
                  title="Ordenar por número de llamadas"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                    </svg>
                    {filters.sortBy === 'total_calls' && (
                      <span className="text-xs">{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </button>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'text-white' 
                    : 'hover:opacity-80'
                }`}
                style={{ 
                  backgroundColor: showFilters ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor: showFilters ? 'var(--color-primary)' : 'var(--color-border)',
                  color: showFilters ? 'white' : 'var(--color-textPrimary)'
                }}
              >
                🔍 Filtros
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                style={{ 
                  backgroundColor: 'var(--color-surface)', 
                  borderColor: 'var(--color-border)', 
                  color: 'var(--color-textPrimary)'
                }}
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
            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                    Disposition
                  </label>
                  <select
                    value={filters.disposition}
                    onChange={(e) => handleFilterChange('disposition', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-textPrimary)'
                    }}
                  >
                    <option value="all">Todas las disposiciones</option>
                    <option value="new_lead">New Lead</option>
                    <option value="possibly_interested">Possibly Interested</option>
                    <option value="owner_not_present">Owner Not Present</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="callback">Callback</option>
                    <option value="successful">Successful</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                    Mínimo de llamadas
                  </label>
                  <select
                    value={filters.minCalls}
                    onChange={(e) => handleFilterChange('minCalls', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-textPrimary)'
                    }}
                  >
                    <option value={1}>1+ llamadas</option>
                    <option value={2}>2+ llamadas</option>
                    <option value={3}>3+ llamadas</option>
                    <option value={5}>5+ llamadas</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                    Con acuerdo económico
                  </label>
                  <select
                    value={filters.hasAgreedAmount}
                    onChange={(e) => handleFilterChange('hasAgreedAmount', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-textPrimary)'
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="yes">Con acuerdo</option>
                    <option value="no">Sin acuerdo</option>
                  </select>
                </div>
                
                <div>
                  <button
                    onClick={() => {
                      setFilters({
                        search: '',
                        disposition: 'all',
                        sortBy: 'last_call_date',
                        sortOrder: 'desc',
                        minCalls: 1,
                        hasAgreedAmount: 'all'
                      })
                      setSearchInput('')
                      setCurrentPage(1)
                    }}
                    className="px-4 py-2 border rounded-lg text-sm font-medium hover:opacity-80 transition-colors"
                    style={{ 
                      backgroundColor: 'var(--color-surfaceHover)', 
                      borderColor: 'var(--color-border)', 
                      color: 'var(--color-textPrimary)'
                    }}
                  >
                    🔄 Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: 'var(--color-border)' }}>
            <thead style={{ backgroundColor: 'var(--color-surfaceHover)' }}>
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Teléfono
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Cliente
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Negocio
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Tipo
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Total Llamadas
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Disposition
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {displayedLeads.map((lead) => (
                <>
                  <tr 
                    key={lead.phone_number} 
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => toggleLeadExpansion(lead.phone_number)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                      {expandedLeads.has(lead.phone_number) ? (
                        <span className="inline-block w-5 h-5 transition-transform duration-200" style={{ color: 'var(--color-textMuted)' }}>▼</span>
                      ) : (
                        <span className="inline-block w-5 h-5 transition-transform duration-200" style={{ color: 'var(--color-textMuted)' }}>▶</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--color-textPrimary)' }}>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{lead.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                      <div>
                        <div className="font-medium">{lead.owner_name || 'N/A'}</div>
                        <div className="text-xs" style={{ color: 'var(--color-textMuted)' }}>{lead.owner_email || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      {lead.business_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      {lead.location_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--color-primaryLight)', color: 'var(--color-primaryDark)' }}>
                        {lead.total_calls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getDispositionBadge(lead.last_disposition)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.agreed_amount ? (
                        <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                          ${lead.agreed_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-textMuted)' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Fila expandible con historial de llamadas */}
                  {expandedLeads.has(lead.phone_number) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6" style={{ backgroundColor: 'var(--color-surfaceHover)' }}>
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold flex items-center" style={{ color: 'var(--color-textPrimary)' }}>
                            <svg className="w-3 h-3 mr-2" style={{ color: 'var(--color-primary)' }} fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="10" />
                            </svg>
                            Historial de llamadas ({lead.total_calls})
                          </h4>
                          
                          {loadingHistory.has(lead.phone_number) ? (
                            <div className="flex items-center justify-center py-6">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                              <span className="ml-3 text-sm" style={{ color: 'var(--color-textSecondary)' }}>Cargando historial...</span>
                            </div>
                          ) : (
                            <div className="relative">
                              {/* Timeline */}
                              <div className="space-y-8">
                                {leadHistory.get(lead.phone_number)?.map((interaction, index) => {
                                  const isLast = index === (leadHistory.get(lead.phone_number)?.length || 0) - 1
                                  
                                  // Función para obtener fecha formateada
                                  const getInteractionDate = () => {
                                    if (interaction.type === 'callback' && interaction.callback_time) {
                                      return new Date(interaction.callback_time)
                                    } else if (interaction.created_at) {
                                      return new Date(interaction.created_at)
                                    }
                                    return new Date()
                                  }

                                  const interactionDate = getInteractionDate()
                                  
                                  return (
                                    <div 
                                      key={`${interaction.type}-${interaction.call_id || interaction.id}-${index}`}
                                      className="relative flex items-start group"
                                    >
                                      {/* Timeline Line */}
                                      {!isLast && (
                                        <div 
                                          className="absolute left-6 top-12 w-0.5"
                                          style={{ 
                                            backgroundColor: 'var(--color-border)',
                                            height: 'calc(100% + 2rem)'
                                          }}
                                        ></div>
                                      )}
                                      
                                      {/* Timeline Dot */}
                                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0"
                                           style={{ 
                                             backgroundColor: 'var(--color-surface)',
                                             borderColor: interaction.type === 'callback' ? 'var(--color-accent)' : 'var(--color-primary)'
                                           }}>
                                        {interaction.type === 'callback' ? (
                                          <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                        )}
                                      </div>
                                      
                                      {/* Timeline Content */}
                                      <div className="ml-4 flex-1 min-w-0">
                                        <div 
                                          className="cursor-pointer transition-all duration-200 group-hover:translate-x-1"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            
                                            if (onCallSelect) {
                                              if (interaction.type === 'call' && interaction.call_id) {
                                                onCallSelect({
                                                  call_id: interaction.call_id,
                                                  disposition: interaction.disposition,
                                                  business_name: interaction.business_name,
                                                  owner_name: interaction.owner_name,
                                                  agreed_amount: interaction.agreed_amount
                                                } as Call)
                                              } else if (interaction.type === 'callback' && interaction.id) {
                                                onCallSelect({
                                                  call_id: interaction.id,
                                                  disposition: interaction.disposition || 'callback',
                                                  business_name: interaction.business_name,
                                                  owner_name: interaction.business_name,
                                                  agreed_amount: interaction.agreed_amount,
                                                  callback_time: interaction.callback_time
                                                } as Call)
                                              }
                                            }
                                          }}
                                        >
                                          {/* Fecha y hora principales */}
                                          <div className="mb-2">
                                            <time className="text-sm font-semibold" style={{ color: 'var(--color-textPrimary)' }}>
                                              {interactionDate.toLocaleDateString('es-ES', { 
                                                day: '2-digit', 
                                                month: 'short',
                                                year: 'numeric'
                                              })} • {interactionDate.toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </time>
                                          </div>
                                          <div className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                                            {interaction.disposition || '—'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div style={{ color: 'var(--color-textSecondary)' }}>
          Página {currentPage} de {totalPages} — {totalCount} resultados
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setCurrentPage(prev => Math.max(1, prev-1))} disabled={!hasPreviousPage} className="px-3 py-1 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            ← Anterior
          </button>
          <button onClick={() => setCurrentPage(prev => prev+1)} disabled={!hasNextPage} className="px-3 py-1 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}