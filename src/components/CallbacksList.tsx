"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllCallbacks, deleteCallbackById, updateCallbackDisposition } from '@/lib/supabase'
import CallbacksModal from './CallbacksModal'

interface CallbackRow {
  id: string
  call_id?: string
  to_number?: string
  callback_owner_name?: string
  callback_time?: string
  callback_time_text_raw?: string
  call_started_at?: string
  disposition?: string
  created_at?: string
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
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCallId, setModalCallId] = useState<string | null>(null)
  async function load(pageToLoad = 1, useFilters = true) {
    setLoading(true)
    try {
      const filters = useFilters ? {
        search: search || undefined,
        disposition: filterDisposition || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      } : undefined

      const res: any = await getAllCallbacks(pageToLoad, limit, filters)
      setCallbacks(res.data || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
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

  function applyFilters() {
    load(1, true)
  }

  function clearFilters() {
    setSearch('')
    setFilterDisposition('')
    setDateFrom('')
    setDateTo('')
    load(1, false)
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

  const getDispositionColor = (disposition?: string | null) => {
    if (!disposition) return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
    switch (disposition.toLowerCase()) {
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

  return (
    <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
      <div className="p-6 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-theme-text-primary">Tabla de Callbacks</h2>
          <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
            {total.toLocaleString()} resultados
          </span>
        </div>
        <div className="text-sm text-theme-text-muted">&nbsp;</div>
      </div>

      {/* Filters row */}
      <div className="p-4 border-b border-theme-border bg-theme-surface">
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
              <option value="invalid_number">invalid_number</option>
              <option value="no_answer">no_answer</option>
              <option value="owner_not_present">owner_not_present</option>
              <option value="not_interested">not_interested</option>
              <option value="possibly_interested">possibly_interested</option>
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
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Fecha</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Owner</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-56">Callback time</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Disposition</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-theme-surface divide-y divide-theme-border">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-theme-text-secondary">Cargando callbacks...</span>
                </div>
              </td></tr>
            ) : callbacks.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-theme-text-secondary">No hay callbacks.</td></tr>
            ) : (
              callbacks.map(cb => (
                <tr key={cb.id} className="hover:bg-theme-surface-hover transition-colors">
                  <td className="px-2 py-1 align-top break-words">
                    <div className="text-xs font-mono text-theme-text-muted break-words whitespace-normal">{cb.to_number || '-'}</div>
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
        <div className="text-sm text-theme-text-primary">Página {page} / {totalPages}</div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => load(Math.max(page - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
          >
            Anterior
          </button>
          <button
            onClick={() => load(Math.min(page + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
          >
            Siguiente
          </button>
        </div>
      </div>
      {isModalOpen && modalCallId && (
        <CallbacksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          callId={modalCallId}
        />
      )}
    </div>
  )
}
