

import { useEffect, useState, useCallback, useRef } from 'react'
import { getCallsWithPagination, type CallWithPCAInfo, type PaginationParams } from '@/lib/supabase'
import AnalysisModal from './AnalysisModal'
import DISPOSITIONS from '@/config/dispositions'

// Función para formatear fecha en formato d-m-Y H:i
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Sin fecha'
  
  try {
    const date = new Date(dateString)
    // Si la fecha no es válida, mostrar call_id como referencia
    if (isNaN(date.getTime())) {
      return 'Pendiente BD'
    }
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${day}-${month}-${year}  ${hours}:${minutes}`
  } catch (error) {
    return 'Pendiente BD'
  }
}

interface TableFilters {
  search: string
  disposition: string
  dateFrom: string
  dateTo: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function ModernCallsTable() {
  // ...existing code...

  // Función para exportar los datos filtrados a CSV
  const handleExportCSV = async () => {
    // 1. Obtener todas las llamadas filtradas
    let allCallIds: string[] = [];
    if (showOnlyCallbacks) {
      const { data, error } = await import('@/lib/supabase').then(mod => mod.supabase
        .from('callbacks')
        .select('call_id')
      );
      if (!error && data) {
        allCallIds = data.map((cb: any) => cb.call_id);
      }
    }
    const paginationParams: PaginationParams = {
      page: 1,
      limit: 10000,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      filters: {
        disposition: filters.disposition === 'all' ? undefined : filters.disposition,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        callIds: showOnlyCallbacks && allCallIds.length > 0 ? allCallIds : undefined
      }
    };
    const response = await getCallsWithPagination(paginationParams);
    const callsData = response.data;
    if (!callsData || callsData.length === 0) {
      alert('No hay llamadas para exportar. Verifica los filtros.');
      return;
    }
    // 2. Obtener todos los callbacks asociados a esas llamadas
    const callIds = callsData.map(call => call.call_id);
    const mod = await import('@/lib/supabase');
    let query = mod.supabase
      .from('callbacks')
      .select('call_id, to_number, callback_owner_phone, callback_time_text_raw, caller_tz, callback_owner_name');
    if (callIds.length > 0) {
      query = query.in('call_id', callIds);
    }
    // Si hay filtro de fechas y el campo es tipo fecha, aplicar
    if (filters.dateFrom) {
      query = query.gte('callback_time_text_raw', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('callback_time_text_raw', filters.dateTo);
    }
    const { data: callbacksData, error: callbacksError } = await query;
    if (callbacksError) {
      console.error('Error en consulta de callbacks:', callbacksError);
    }
    // 3. Crear un mapa de callbacks por call_id
    const callbacksMap = new Map();
    if (callbacksData && Array.isArray(callbacksData)) {
      callbacksData.forEach(cb => {
        callbacksMap.set(cb.call_id, cb);
      });
    }
    // 4. Construir el CSV solo con las columnas solicitadas
    // phone number (calls.to_number), callback_owner_phone, callback_time_text_raw, caller_tz, callback_owner_name
    let csv = 'phone number,callback_owner_phone,callback_time_text_raw,caller_tz,callback_owner_name\n';
    callsData.forEach(call => {
      const cb = callbacksMap.get(call.call_id) || {};
      csv += `"${call.to_number || ''}","${cb.callback_owner_phone || ''}","${cb.callback_time_text_raw || ''}","${cb.caller_tz || ''}","${cb.callback_owner_name || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calls_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const [showOnlyCallbacks, setShowOnlyCallbacks] = useState(false);
  const [callbackCallIds, setCallbackCallIds] = useState<string[]>([]);
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [selectedCallData, setSelectedCallData] = useState<CallWithPCAInfo | null>(null)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  
  // Estados para paginación del servidor
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Estados para búsqueda mejorada
  const [searchInput, setSearchInput] = useState('')
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Estados separados para fechas temporales y aplicadas
  const [tempDateFilters, setTempDateFilters] = useState({
    dateFrom: '',
    dateTo: ''
  })
  
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    disposition: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  useEffect(() => {
    if (showOnlyCallbacks) {
      // Cuando el filtro de callbacks está activo, obtener todos los call_id de la tabla callbacks antes de llamar a fetchCalls
      (async () => {
        const { data, error } = await import('@/lib/supabase').then(mod => mod.supabase
          .from('callbacks')
          .select('call_id')
        );
        if (!error && data) {
          setCallbackCallIds(data.map((cb: any) => cb.call_id));
        }
        fetchCalls(data ? data.map((cb: any) => cb.call_id) : []);
      })();
    } else {
      fetchCalls();
    }
  }, [showOnlyCallbacks, currentPage, itemsPerPage, filters.search, filters.disposition, filters.sortBy, filters.sortOrder, filters.dateFrom, filters.dateTo])

  // Sincronizar filtros temporales con filtros aplicados al montar
  useEffect(() => {
    setTempDateFilters({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    })
  }, [filters.dateFrom, filters.dateTo])

  const fetchCalls = async (allCallbackIds?: string[]) => {
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
          disposition: filters.disposition === 'all' ? undefined : filters.disposition,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          callIds: showOnlyCallbacks && allCallbackIds && allCallbackIds.length > 0 ? allCallbackIds : undefined
        }
      }
      
      const response = await getCallsWithPagination(paginationParams)
      
      setCalls(response.data)
      setTotalItems(response.total)
      setTotalPages(response.totalPages)
    } catch (err) {
      console.error('Error fetching calls:', err)
      
      // Si hay error con created_at, cambiar a call_id como fallback
      if (err instanceof Error && err.message?.includes('created_at') && filters.sortBy === 'created_at') {
        console.log('Fallback: cambiando ordenamiento a call_id')
        setFilters(prev => ({ ...prev, sortBy: 'call_id' }))
        return
      }
      
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setCalls([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleViewAnalysis = (callId: string) => {
    const call = calls.find(c => c.call_id === callId) || null
    setSelectedCallData(call)
    setSelectedCallId(callId)
    setIsAnalysisModalOpen(true)
  }

  const closeAnalysisModal = () => {
    setIsAnalysisModalOpen(false)
    setSelectedCallId(null)
    setSelectedCallData(null)
  }

  // Función para manejar búsqueda con debounce
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      setCurrentPage(1)
    }, 800) // Esperar 800ms después de dejar de escribir
  }, [])

  // Función para manejar el cambio en el input de búsqueda
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
    debouncedSearch(value)
  }

  // Función para buscar inmediatamente al presionar Enter
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      setFilters(prev => ({ ...prev, search: searchInput }))
      setCurrentPage(1)
    }
  }

  // Limpiar timeout al desmontar componente
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleFilterChange = (key: keyof TableFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleTempDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    setTempDateFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyDateFilters = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: tempDateFilters.dateFrom,
      dateTo: tempDateFilters.dateTo
    }))
    setCurrentPage(1)
  }

  const clearDateFilters = () => {
    setTempDateFilters({ dateFrom: '', dateTo: '' })
    setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))
    setCurrentPage(1)
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
  const filteredCalls = paginatedCalls;

  const getStatusBadge = (disposition?: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    
    switch (disposition?.toLowerCase()) {
      // Dispositions positivos (verde)
      case 'new_lead':
      case 'interested':
      case 'possibly_interested':
      case 'successful':
      case 'success':
      case 'sale':
      case 'converted':
        return `${baseClasses} bg-theme-success/10 text-theme-success`
      
      // Dispositions de seguimiento (azul)
      case 'callback':
      case 'follow_up':
      case 'scheduled':
      case 'reschedule':
        return `${baseClasses} bg-theme-primary/10 text-theme-primary`
      
      // Dispositions de no contacto (amarillo)
      case 'owner_not_present':
      case 'no_answer':
      case 'busy':
      case 'unavailable':
        return `${baseClasses} bg-theme-warning/10 text-theme-warning`
      
      // Dispositions negativos (rojo)
      case 'not_interested':
      case 'failed':
      case 'failure':
      case 'rejected':
      case 'wrong_number':
        return `${baseClasses} bg-theme-error/10 text-theme-error`
      
      // Dispositions pendientes (púrpura)
      case 'pending':
      case 'in_progress':
      case 'processing':
        return `${baseClasses} bg-theme-accent/10 text-theme-accent`
      
      // Default (gris)
      default:
        return `${baseClasses} bg-theme-surface-hover text-theme-text-muted`
    }
  }

  // Heurística para detectar contestador/voicemail en disconnection_reason
  const isAnsweringMachine = (reason?: string | null) => {
    if (!reason) return false
    const s = reason.toString().toLowerCase()
    return /contest|buzon|voicemail|answering|contestador|machine|grabadora|grabación|contestadoras/.test(s)
  }

  if (loading) {
    return (
      <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-theme-text-secondary">Cargando llamadas...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-theme-error/10 border border-theme-error/20 rounded-2xl p-8 text-center">
        <div className="text-theme-error text-4xl mb-4">⚠️</div>
        <h3 className="text-theme-error font-semibold text-lg mb-2">Error al cargar las llamadas</h3>
        <p className="text-theme-error">{error}</p>
      </div>
    )
  }

  return (
  <div className="space-y-6">
      {/* Table Header with Controls */}
      <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
        <div className="px-4 py-4 border-b border-theme-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-theme-text-primary">Tabla de Llamadas</h2>
              <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
                {totalItems.toLocaleString()} registros
              </span>
              <button
                className={`px-3 py-1 rounded-theme text-xs font-medium border ml-2 ${showOnlyCallbacks ? 'bg-theme-primary text-white border-theme-primary' : 'bg-theme-surface text-theme-text-primary border-theme-border hover:bg-theme-surface-hover'}`}
                onClick={() => setShowOnlyCallbacks(v => !v)}
                title="Filtrar solo llamadas con callback"
              >
                {showOnlyCallbacks ? 'Ver todas' : 'Solo con callback'}
              </button>
              <button
                className="px-3 py-1 rounded-theme text-xs font-medium border ml-2 bg-theme-surface text-theme-text-primary border-theme-border hover:bg-theme-surface-hover"
                onClick={handleExportCSV}
                title="Exportar resultados filtrados a CSV"
              >
                Exportar CSV
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por empresa, propietario, teléfono... (presiona Enter para buscar)"
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="px-4 py-2 bg-theme-surface border border-theme-border rounded-theme focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-sm text-theme-text-primary min-w-[300px]"
                />
                {searchInput !== filters.search && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-theme-primary rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              {/* Botones de ordenamiento rápido */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('created_at')}
                  className={`px-3 py-2 text-sm font-medium rounded-theme transition-colors ${
                    filters.sortBy === 'created_at' 
                      ? 'bg-theme-primary text-white' 
                      : 'bg-theme-surface-hover text-theme-text-primary hover:bg-theme-surface-hover'
                  }`}
                  title="Ordenar por fecha"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {filters.sortBy === 'created_at' && (
                      <span className="text-xs">{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleSort('disposition')}
                  className={`px-3 py-2 text-sm font-medium rounded-theme transition-colors ${
                    filters.sortBy === 'disposition' 
                      ? 'bg-theme-primary text-white' 
                      : 'bg-theme-surface-hover text-theme-text-primary hover:bg-theme-surface-hover'
                  }`}
                  title="Ordenar por disposición"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {filters.sortBy === 'disposition' && (
                      <span className="text-xs">{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </button>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-theme text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'bg-theme-primary text-white border-theme-primary' 
                    : 'bg-theme-surface text-theme-text-primary border-theme-border hover:bg-theme-surface-hover'
                }`}
              >
                🔍 Filtros
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-4 py-2 bg-theme-surface border border-theme-border rounded-theme focus:outline-none focus:ring-2 focus:ring-theme-primary/20 text-sm text-theme-text-primary"
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
            <div className="mt-6 pt-6 border-t border-theme-border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <select
                  value={filters.disposition}
                  onChange={(e) => handleFilterChange('disposition', e.target.value)}
                  className="px-3 py-2 border border-theme-border bg-theme-surface rounded-theme text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20 text-sm"
                >
                  <option value="all">Todas las disposiciones</option>
                  {DISPOSITIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={tempDateFilters.dateFrom ? new Date(tempDateFilters.dateFrom + 'T00:00:00').toLocaleDateString('es-ES') : ''}
                      onClick={() => {
                        const dateInput = document.getElementById('dateFrom') as HTMLInputElement
                        dateInput?.showPicker()
                      }}
                      readOnly
                      placeholder="dd/mm/aaaa"
                      className="pl-10 pr-8 py-2 border border-theme-border bg-theme-surface rounded-theme text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20 text-sm w-full cursor-pointer hover:bg-theme-surface-hover transition-colors"
                    />
                    <input
                      id="dateFrom"
                      type="date"
                      value={tempDateFilters.dateFrom}
                      onChange={(e) => handleTempDateChange('dateFrom', e.target.value)}
                      className="absolute opacity-0 pointer-events-none"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {tempDateFilters.dateFrom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTempDateChange('dateFrom', '')
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <label className="absolute -top-2 left-2 bg-theme-surface px-1 text-xs text-theme-text-secondary">
                    Desde
                  </label>
                </div>
                
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={tempDateFilters.dateTo ? new Date(tempDateFilters.dateTo + 'T00:00:00').toLocaleDateString('es-ES') : ''}
                      onClick={() => {
                        const dateInput = document.getElementById('dateTo') as HTMLInputElement
                        dateInput?.showPicker()
                      }}
                      readOnly
                      placeholder="dd/mm/aaaa"
                      className="pl-10 pr-8 py-2 border border-theme-border bg-theme-surface rounded-theme text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/20 text-sm w-full cursor-pointer hover:bg-theme-surface-hover transition-colors"
                    />
                    <input
                      id="dateTo"
                      type="date"
                      value={tempDateFilters.dateTo}
                      onChange={(e) => handleTempDateChange('dateTo', e.target.value)}
                      className="absolute opacity-0 pointer-events-none"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {tempDateFilters.dateTo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTempDateChange('dateTo', '')
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <label className="absolute -top-2 left-2 bg-theme-surface px-1 text-xs text-theme-text-secondary">
                    Hasta
                  </label>
                </div>
                
                {/* Botones de control de fechas */}
                <div className="flex gap-2">
                  <button
                    onClick={clearDateFilters}
                    disabled={!tempDateFilters.dateFrom && !tempDateFilters.dateTo}
                    className="px-3 py-2 text-theme-text-secondary hover:text-theme-text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-theme-border rounded-theme hover:bg-theme-surface-hover"
                  >
                    Limpiar fechas
                  </button>
                  <button
                    onClick={applyDateFilters}
                    disabled={!tempDateFilters.dateFrom && !tempDateFilters.dateTo}
                    className="px-4 py-2 bg-theme-primary text-white rounded-theme hover:bg-theme-primary-hover text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    if (debounceTimeoutRef.current) {
                      clearTimeout(debounceTimeoutRef.current)
                    }
                    setSearchInput('')
                    setTempDateFilters({ dateFrom: '', dateTo: '' })
                    setFilters({
                      search: '',
                      disposition: 'all',
                      dateFrom: '',
                      dateTo: '',
                      sortBy: 'business_name',
                      sortOrder: 'desc'
                    })
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 text-theme-text-secondary hover:text-theme-text-primary text-sm"
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
            <thead className="bg-theme-surface-hover">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider cursor-pointer hover:bg-theme-surface-hover"
                  onClick={() => handleSort('business_name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Empresa</span>
                    {filters.sortBy === 'business_name' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                {/* Columna 'Propietario' eliminada por petición del usuario */}
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  Teléfono
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider cursor-pointer hover:bg-theme-surface-hover"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Fecha</span>
                    {filters.sortBy === 'created_at' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  Estado
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider cursor-pointer hover:bg-theme-surface-hover"
                  onClick={() => handleSort('disposition')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Disposición</span>
                    {filters.sortBy === 'disposition' && (
                      <span>{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                {/* Columna 'Monto' eliminada por petición del usuario */}
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-theme-surface divide-y divide-theme-border">
              {filteredCalls.map((call, index) => (
                <tr 
                  key={call.call_id} 
                  className="hover:bg-theme-surface-hover transition-colors"
                >
                  <td className="px-2 py-1 whitespace-nowrap">
                    <div className="text-xs text-theme-text-primary">{call.business_name || 'N/A'}</div>
                  </td>
                  {/* Owner column removed */}
                  <td className="px-2 py-1 whitespace-nowrap">
                    <div className="text-xs font-mono text-theme-text-muted">{(call as any).lead_phone || call.owner_phone || call.to_number || 'N/A'}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    <div className="text-xs text-theme-text-secondary">{formatDate(call.created_at)}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {(() => {
                      // Determinamos el estado exclusivamente por call_successful cuando esté disponible
                      // Si detectamos contestador por el motivo, considerarlo fallida aunque call_successful sea true
                      if (isAnsweringMachine(call.disconnection_reason)) {
                        return (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-error/10 text-theme-error">Fallida</span>
                          </div>
                        )
                      }

                      if (call.call_successful === true) {
                        return (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-success/10 text-theme-success">Exitosa</span>
                          </div>
                        )
                      }

                      if (call.call_successful === false) {
                        return (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-error/10 text-theme-error">Fallida</span>
                          </div>
                        )
                      }

                      // Si call_successful no está definido, caer atrás a heurísticas por disposition
                      const negativeDisps = ['not_interested', 'failed', 'failure', 'hangup', 'wrong_number', 'no_answer', 'owner_not_present']
                      const positiveDisps = ['new_lead', 'interested', 'possibly_interested', 'successful', 'success', 'sale', 'converted']
                      const disp = (call.disposition || '').toString().toLowerCase()

                      if (negativeDisps.includes(disp)) {
                        return (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-error/10 text-theme-error">Fallida</span>
                          </div>
                        )
                      }

                      if (positiveDisps.includes(disp)) {
                        return (
                          <div className="flex flex-col">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-success/10 text-theme-success">Exitosa</span>
                          </div>
                        )
                      }

                      // Fallback: mostrar N/A
                      return (
                        <div className="flex flex-col">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-theme-surface-hover text-theme-text-muted">N/A</span>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    <span className={getStatusBadge(call.disposition)}>
                      {call.disposition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-theme-text-secondary">
                    {(() => {
                      if (call.duration_ms === null || call.duration_ms === undefined) return 'N/A';
                      const totalSeconds = Math.round(call.duration_ms / 1000);
                      const minutes = Math.floor(totalSeconds / 60);
                      const seconds = totalSeconds % 60;
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    })()}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs">
                    {call.hasPCA && (
                      <button
                        onClick={() => handleViewAnalysis(call.call_id)}
                        className="inline-flex items-center px-2 py-1 border border-theme-accent text-theme-accent bg-theme-accent/10 hover:bg-theme-accent/20 rounded-theme text-xs font-medium transition-colors"
                      >
                        Análisis
                        <span className="ml-1 w-2 h-2 bg-theme-accent rounded-full"></span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t border-theme-border bg-theme-surface-hover">
            <div className="flex items-center justify-between flex-col md:flex-row gap-3 md:gap-0">
              <div className="text-sm text-theme-text-primary">
                Mostrando {totalItems === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} registros
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
                  aria-label="Página anterior"
                >
                  Anterior
                </button>

                {/* Page numbers with window and ellipsis */}
                <div className="hidden sm:flex items-center space-x-1">
                  {(() => {
                    const pages: (number | string)[] = []
                    const maxButtons = 7
                    if (totalPages <= maxButtons) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i)
                    } else {
                      const left = Math.max(2, currentPage - 2)
                      const right = Math.min(totalPages - 1, currentPage + 2)
                      pages.push(1)
                      if (left > 2) pages.push('...')
                      for (let i = left; i <= right; i++) pages.push(i)
                      if (right < totalPages - 1) pages.push('...')
                      pages.push(totalPages)
                    }

                    return pages.map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-sm text-theme-text-secondary">...</span>
                        )
                      }

                      const pageNum = Number(p)
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-theme text-sm border ${pageNum === currentPage ? 'bg-theme-primary text-white border-theme-primary' : 'bg-theme-surface text-theme-text-primary border-theme-border hover:bg-theme-surface-hover'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })
                  })()}
                </div>

                {/* Small screens: compact page indicator */}
                <div className="sm:hidden text-sm text-theme-text-secondary">{currentPage}/{totalPages}</div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
                  aria-label="Página siguiente"
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
          onClose={() => {
            setIsAnalysisModalOpen(false);
            setSelectedCallId(null);
            setSelectedCallData(null);
          }}
          callId={selectedCallId}
          initialCallData={selectedCallData}
        />
      )}
    </div>
  );
}