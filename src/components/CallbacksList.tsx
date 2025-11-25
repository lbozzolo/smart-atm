"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllCallbacks, deleteCallbackById, updateCallbackDisposition, getPossiblyInterestedCallsWithoutCallbacks, updateCallbackById } from '@/lib/supabase'
import CallbacksModal from './CallbacksModal'
import DISPOSITIONS from '@/config/dispositions'

interface CallbackRow {
  id: string
  call_id?: string
  to_number?: string
  callback_owner_name?: string
  callback_time?: string
  callback_time_text_raw?: string
  call_started_at?: string
  disposition?: string
  status?: string
  created_at?: string
  business_name?: string
  lead_business_name?: string
  business?: string
}

const CALLBACK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  retry_scheduled: 'Reintento Programado',
  cancelled: 'Cancelado'
}

export default function CallbacksList() {
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  // Filters
  const [search, setSearch] = useState('')
  const [filterDisposition, setFilterDisposition] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [possiblyCalls, setPossiblyCalls] = useState<any[]>([])
  const [possiblyTotal, setPossiblyTotal] = useState(0)
  const [possiblyTotalPages, setPossiblyTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCallId, setModalCallId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'callbacks' | 'possibly_interested'>('callbacks')
  
  const [filterStatus, setFilterStatus] = useState('pending')
  
  // Inline status editing
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  
  // Para navegación en el modal: extraer todos los call_ids de la página actual
  const getCurrentCallIds = (): string[] => {
    if (activeView === 'possibly_interested') {
      return possiblyCalls.map(c => c.call_id || c.id).filter(Boolean)
    } else {
      return callbacks.map(c => c.call_id || c.id).filter(Boolean)
    }
  }

  const handleNavigateToCall = (callId: string) => {
    setModalCallId(callId)
  }

  async function load(pageToLoad = 1, useFilters = true, overrides: Record<string, any> = {}) {
    setLoading(true)
    try {
      const filters = useFilters ? {
        search: search || undefined,
        disposition: filterDisposition || undefined,
        status: (activeView === 'callbacks' && filterStatus !== 'all') ? filterStatus : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        ...overrides
      } : undefined

      if (activeView === 'possibly_interested') {
        const res: any = await getPossiblyInterestedCallsWithoutCallbacks(pageToLoad, limit, {
          search: filters?.search,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo
        })
        setPossiblyCalls(res.data || [])
        setPossiblyTotal(res.total || 0)
        setPossiblyTotalPages(res.totalPages || 1)
      } else {
        const res: any = await getAllCallbacks(pageToLoad, limit, filters)
        setCallbacks(res.data || [])
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || 1)
      }
      setPage(pageToLoad)
    } catch (err) {
      console.error('Error loading callbacks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  const colCount = activeView === 'possibly_interested' ? 5 : 8

  // Cuando cambia la vista (pestaña), ajustar filtro y recargar
  useEffect(() => {
    if (activeView === 'possibly_interested') {
      setFilterDisposition('possibly_interested')
      load(1, true, { disposition: 'possibly_interested' })
    } else {
      // regresar a la vista por defecto sin forzar disposition
      setFilterDisposition('')
      load(1, true, { disposition: '' })
    }
  }, [activeView, filterStatus])

  function applyFilters() {
    load(1, true)
  }

  function clearFilters() {
    setSearch('')
    setFilterDisposition('')
    setDateFrom('')
    setDateTo('')
    // No reseteamos el status tab aquí para no confundir al usuario, o tal vez sí?
    // Mejor mantenemos el tab actual.
    load(1, true) // load(1, true) usará el estado actual de los filtros (que acabamos de limpiar)
  }

  async function handleDelete(id: string) {
    const ok = confirm('¿Eliminar este callback? Esta acción no se puede deshacer.')
    if (!ok) return
    try {
      await deleteCallbackById(id)
      // reload current page
      load(page)
    } catch (err) {
      console.error('Error deleting callback:', err)
      alert('Error eliminando callback')
    }
  }

  async function handleMarkCompleted(id: string) {
    try {
      await updateCallbackDisposition(id, 'Completed')
      load(page)
    } catch (err) {
      console.error('Error updating disposition:', err)
      alert('Error marcando como completado')
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      setUpdatingStatus(true)
      await updateCallbackById(id, { status: newStatus })
      // Update local state immediately
      setCallbacks(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
      setEditingStatusId(null)
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Error actualizando estado')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getDispositionColor = (disposition?: string | null) => {
    if (!disposition) return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
    switch (disposition.toLowerCase()) {
      case 'possibly_interested':
        return 'bg-theme-success/10 text-theme-success border-theme-success/20'
      case 'sale':
      case 'interested':
      case 'appointment':
      case 'callback':
        return 'bg-theme-success/10 text-theme-success border-theme-success/20'
      case 'not_interested':
      case 'no_answer':
      case 'hangup':
      case 'wrong_number':
        return 'bg-theme-error/10 text-theme-error border-theme-error/20'
      case 'busy':
      case 'busy_signal':
        return 'bg-theme-accent/10 text-theme-accent border-theme-accent/20'
      case 'voicemail':
      case 'buzon':
      case 'voicemail_left':
        return 'bg-theme-primary/10 text-theme-primary border-theme-primary/20'
      default:
        return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600 border-gray-200'
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'retry_scheduled': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
      <div className="p-6 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-theme-text-primary">
            {activeView === 'possibly_interested' ? 'Oportunidades' : 'Tabla de Callbacks'}
          </h2>
          <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
            {(activeView === 'possibly_interested' ? possiblyTotal : total).toLocaleString()} resultados
          </span>
        </div>
        <div>
          <button
            onClick={() => setActiveView(activeView === 'callbacks' ? 'possibly_interested' : 'callbacks')}
            className={`px-4 py-2 rounded-theme text-sm font-medium transition-colors ${
              activeView === 'possibly_interested' 
                ? 'bg-theme-surface border border-theme-border text-theme-text-primary hover:bg-theme-surface-hover' 
                : 'bg-theme-accent/10 text-theme-accent border border-theme-accent/20 hover:bg-theme-accent/20'
            }`}
          >
            {activeView === 'callbacks' ? 'Ver Oportunidades' : 'Volver a Callbacks'}
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="p-4 border-b border-theme-border bg-theme-surface">
        
        {/* Status Tabs (only for callbacks view) */}
        {activeView === 'callbacks' && (
          <div className="mb-4 border-b border-theme-border">
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'border-theme-primary text-theme-primary'
                    : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border'
                }`}
              >
                Todos
              </button>
              {Object.entries(CALLBACK_STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    filterStatus === key
                      ? 'border-theme-primary text-theme-primary'
                      : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 gap-3">
          <div className="flex-1 min-w-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }}
              placeholder="Buscar por teléfono, owner o texto callback..."
              className="w-full px-3 py-2 rounded border border-theme-border bg-theme-surface text-theme-text-primary text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select value={filterDisposition} onChange={(e) => setFilterDisposition(e.target.value)} className="px-3 py-2 rounded border border-theme-border bg-theme-surface text-sm text-theme-text-primary">
              <option value="">Todas disposiciones</option>
              {DISPOSITIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded border border-theme-border bg-theme-surface text-sm text-theme-text-primary" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded border border-theme-border bg-theme-surface text-sm text-theme-text-primary" />

            <button onClick={applyFilters} className="px-3 py-2 bg-theme-primary text-white rounded text-sm">Aplicar</button>
            <button onClick={clearFilters} className="px-3 py-2 border border-theme-border rounded text-sm">Limpiar</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-theme-surface-hover sticky top-0 z-10">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-28">Teléfono</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-48">Negocio</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Fecha</th>
              {activeView !== 'possibly_interested' && (
                <>
                  <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Owner</th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-56">Callback time</th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Estado</th>
                </>
              )}
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Disposition</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-theme-surface divide-y divide-theme-border">
            {loading ? (
              <tr><td colSpan={colCount} className="p-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-theme-text-secondary">Cargando...</span>
                </div>
              </td></tr>
            ) : activeView === 'possibly_interested' ? (
              possiblyCalls.length === 0 ? (
                <tr><td colSpan={colCount} className="p-8 text-center text-theme-text-secondary">No hay llamadas posiblemente interesadas sin callbacks.</td></tr>
              ) : (
                possiblyCalls.map((call: any) => (
                  <tr key={call.call_id} className="hover:bg-theme-surface-hover transition-colors">
                    <td className="px-2 py-1 align-top break-words">
                      <div className="text-xs font-mono text-theme-text-muted break-words whitespace-normal">{call.to_number || '-'}</div>
                    </td>
                    <td className="px-2 py-1 align-top break-words">
                      <div className="text-xs text-theme-text-primary break-words whitespace-normal">{call.business_name || call.company_name || call.business || '-'}</div>
                    </td>
                    <td className="px-2 py-1 align-top break-words">
                      <div className="text-xs text-theme-text-secondary">{call.created_at ? new Date(call.created_at).toLocaleString('es-ES') : '-'}</div>
                    </td>
                    {/* Owner and Callback time omitted for possibly_interested view */}
                    <td className="px-2 py-1 align-top break-words">
                      <div className="text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getDispositionColor(call.disposition)}`}>
                          {call.disposition || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1 align-top flex items-center gap-2">
                      <button
                        onClick={() => {
                          setModalCallId(call.call_id || null)
                          setIsModalOpen(true)
                        }}
                        className="inline-flex items-center px-2 py-1 border border-theme-primary text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 rounded-theme text-xs font-medium transition-colors"
                      >
                        Ver
                      </button>

                      <Link
                        href={call.to_number ? `/clientes/${encodeURIComponent(call.to_number)}` : '#'}
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-theme transition-colors ${call.to_number ? 'border border-theme-border text-theme-text-primary hover:bg-theme-surface' : 'opacity-50 cursor-not-allowed'}`}
                        aria-disabled={!call.to_number}
                      >
                        Historial
                      </Link>
                    </td>
                  </tr>
                ))
              )
            ) : callbacks.length === 0 ? (
              <tr><td colSpan={colCount} className="p-8 text-center text-theme-text-secondary">No hay callbacks.</td></tr>
            ) : (
              callbacks.map(cb => (
                <tr key={cb.id} className="hover:bg-theme-surface-hover transition-colors">
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs font-mono text-theme-text-muted break-words whitespace-normal">{cb.to_number || '-'}</div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs text-theme-text-primary break-words whitespace-normal">{cb.business_name || cb.lead_business_name || cb.business || '-'}</div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs text-theme-text-secondary">{cb.call_started_at ? new Date(cb.call_started_at).toLocaleString('es-ES') : (cb.created_at ? new Date(cb.created_at).toLocaleString('es-ES') : '-')}</div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs text-theme-text-primary break-words whitespace-normal">{cb.callback_owner_name || 'N/A'}</div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs text-theme-text-secondary">{cb.callback_time_text_raw || cb.callback_time || '-'}</div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs">
                      {editingStatusId === cb.id ? (
                        <select
                          autoFocus
                          className="text-xs border rounded p-1 w-full bg-white"
                          value={cb.status || 'pending'}
                          onChange={(e) => handleStatusChange(cb.id, e.target.value)}
                          onBlur={() => setEditingStatusId(null)}
                          disabled={updatingStatus}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.entries(CALLBACK_STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingStatusId(cb.id)
                          }}
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(cb.status)} cursor-pointer hover:opacity-80 text-left`}
                          title="Clic para cambiar estado"
                        >
                          {CALLBACK_STATUS_LABELS[cb.status || 'pending'] || cb.status || 'Pendiente'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getDispositionColor(cb.disposition)}`}>
                        {cb.disposition || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top flex items-center gap-2">
                    <button
                      onClick={() => {
                        const callId = cb.call_id || cb.id
                        setModalCallId(callId || null)
                        setIsModalOpen(true)
                      }}
                      className="inline-flex items-center px-2 py-1 border border-theme-primary text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 rounded-theme text-xs font-medium transition-colors"
                    >
                      Ver
                    </button>

                    <Link
                      href={cb.to_number ? `/clientes/${encodeURIComponent(cb.to_number)}` : '#'}
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-theme transition-colors ${cb.to_number ? 'border border-theme-border text-theme-text-primary hover:bg-theme-surface' : 'opacity-50 cursor-not-allowed'}`}
                      aria-disabled={!cb.to_number}
                    >
                      Historial
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 mt-4 p-4">
  <div className="text-sm text-theme-text-primary">Página {page} / {(activeView === 'possibly_interested' ? possiblyTotalPages : totalPages)}</div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => load(Math.max(page - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
          >
            Anterior
          </button>
          <button
            onClick={() => load(Math.min(page + 1, (activeView === 'possibly_interested' ? possiblyTotalPages : totalPages)))}
            disabled={page === (activeView === 'possibly_interested' ? possiblyTotalPages : totalPages)}
            className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
          >
            Siguiente
          </button>
        </div>
      </div>
      {isModalOpen && modalCallId && (
        <CallbacksModal
          isOpen={isModalOpen}
          onClose={(shouldReload?: boolean) => { setIsModalOpen(false); if (shouldReload) load(1); }}
          callId={modalCallId}
          source={activeView === 'possibly_interested' ? 'possibly_interested' : undefined}
          allCallIds={getCurrentCallIds()}
          onNavigate={handleNavigateToCall}
        />
      )}
    </div>
  )
}
