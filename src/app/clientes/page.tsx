"use client"
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
// Utilidad para obtener la última llamada de cada cliente
async function getLastCallDates(phoneNumbers: string[]): Promise<Record<string, string | null>> {
  if (phoneNumbers.length === 0) return {}
  // Normalizar números (eliminar espacios, guiones, paréntesis)
  const normalize = (num: string) => num.replace(/[^\d]/g, '')
  const normalizedNumbers = phoneNumbers.map(normalize)
    const { data, error } = await supabase
    .from('calls')
    .select('to_number, created_at')
    .in('to_number', normalizedNumbers)
    .order('created_at', { ascending: false })
    console.log('Consulta calls:', { normalizedNumbers, data, error })
  console.log('Datos recibidos de calls:', data)
  const lastDates: Record<string, string> = {}
  if (data) {
    data.forEach(call => {
      const normNum = normalize(call.to_number)
      if (!lastDates[normNum]) {
        lastDates[normNum] = call.created_at
      }
    })
  }
  // Retornar usando los números normalizados
    const result = phoneNumbers.reduce((acc, num) => {
    acc[num] = lastDates[normalize(num)] || null
    return acc
  }, {} as Record<string, string | null>)
    console.log('lastDates mapeado:', result)
    return result
}

// Obtener conteo de callbacks por teléfono
async function getCallbackCounts(phoneNumbers: string[]): Promise<Record<string, number>> {
  // Simpler approach: count callbacks by callbacks.to_number matching leads.phone_number
  if (phoneNumbers.length === 0) return {}
  const normalize = (num: string) => num.replace(/[^\d]/g, '')
  const normalized = phoneNumbers.map(normalize)

  // Query callbacks by to_number in the normalized list
  const { data: callbacksData, error: callbacksErr } = await supabase
    .from('callbacks')
    .select('to_number')
    .in('to_number', normalized)
  if (callbacksErr) console.log('Error fetching callbacks by to_number', callbacksErr)

  const countsByNorm: Record<string, number> = {}
  if (callbacksData) {
    callbacksData.forEach((cb: any) => {
      const norm = normalize(cb.to_number)
      countsByNorm[norm] = (countsByNorm[norm] || 0) + 1
    })
  }

  return phoneNumbers.reduce((acc, num) => {
    acc[num] = countsByNorm[normalize(num)] || 0
    return acc
  }, {} as Record<string, number>)
}

// Componente para mostrar la cantidad de llamadas
function LlamadasCount({ phoneNumber }: { phoneNumber: string }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let isMounted = true
    const fetchCount = async () => {
      const { count } = await supabase
        .from('calls')
        .select('to_number', { count: 'exact', head: true })
        .eq('to_number', phoneNumber)
      if (isMounted) setCount(count || 0)
    }
    fetchCount()
    return () => { isMounted = false }
  }, [phoneNumber])
  return <span className="text-sm font-semibold text-theme-primary">{count !== null ? count : '-'}</span>
}
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function ClientesPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  type Lead = {
  phone_number: string
  business_name?: string
  address?: string
  created_at?: string
  last_call_date: string | null
  callbacks_count: number
  }
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<'business_name' | 'last_call_date'>('business_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  // remove disposition filter
  const [onlyWithCallbacks, setOnlyWithCallbacks] = useState(false)
  const [loteDate, setLoteDate] = useState<string>('')
  const ITEMS_PER_PAGE = 25

  // Helper para generar paginación compacta con elipsis
  const getPaginationItems = (
    current: number,
    totalPages: number,
    siblingCount = 1,
    boundaryCount = 1
  ): Array<number | 'ellipsis'> => {
    const items: Array<number | 'ellipsis'> = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i)
      return items
    }

    const startPages = Array.from({ length: Math.min(boundaryCount, totalPages) }, (_, i) => i + 1)
    const endPages = Array.from({ length: Math.min(boundaryCount, totalPages) }, (_, i) => totalPages - i).reverse()
    const leftSibling = Math.max(current - siblingCount, boundaryCount + 2)
    const rightSibling = Math.min(current + siblingCount, totalPages - boundaryCount - 1)

    // Inicio
    items.push(...startPages)
    if (leftSibling > boundaryCount + 2) items.push('ellipsis')
    else if (boundaryCount + 1 < leftSibling) items.push(boundaryCount + 1)

    // Zona central
    for (let i = leftSibling; i <= rightSibling; i++) items.push(i)

    // Fin
    if (rightSibling < totalPages - boundaryCount - 1) items.push('ellipsis')
    else if (rightSibling < totalPages - boundaryCount) items.push(totalPages - boundaryCount)
    items.push(...endPages)

    // Devolver únicos y ordenados (por seguridad)
    const seen = new Set<string>()
    return items.filter(it => {
      const key = typeof it === 'number' ? `n${it}` : `e${seen.size}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      console.log('fetchLeads start', { loteDate, search, currentPage, onlyWithCallbacks })
      let query = supabase
        .from('leads')
        .select('phone_number, business_name, address, created_at', { count: 'exact' })
      // Si el usuario quiere sólo leads con callbacks, obtener los phone_numbers asociados server-side
      if (onlyWithCallbacks) {
        // Obtener directamente los to_number desde callbacks y filtrar leads por phone_number
        const { data: cbData, error: cbErr } = await supabase.from('callbacks').select('to_number')
        if (cbErr) console.log('Error fetching callbacks to_number', cbErr)
        const phoneNumbersWithCallbacks = (cbData || []).map((c: any) => c.to_number).filter(Boolean)
        if (phoneNumbersWithCallbacks.length === 0) {
          // No hay callbacks -> no mostrar leads
          setLeads([])
          setTotalItems(0)
          setLoading(false)
          return
        }
        // Aplicar filtro server-side por phone_number
        query = query.in('phone_number', phoneNumbersWithCallbacks)
      }
      if (search.trim()) {
        query = query.or(`phone_number.ilike.%${search}%,business_name.ilike.%${search}%`)
      }
      // Filtro por lote usando rango UTC del día
      if (loteDate) {
        const startDate = new Date(`${loteDate}T00:00:00Z`)
        const endDate = new Date(startDate)
        endDate.setUTCDate(endDate.getUTCDate() + 1)
        const startISO = startDate.toISOString()
        const endISO = endDate.toISOString()
        console.log('Filtro lote clientes', { loteDate, startISO, endISO })
        query = query.gte('created_at', startISO).lt('created_at', endISO)
      }
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)
      const { data, error, count } = await query
      console.log('fetchLeads response', { loteDate, error, count, rows: data?.length })
      // Fallback: si algunos rows no traen created_at, reconsultar sólo esos phone_numbers
      let rows = data || []
      const missingCreatedPhones = rows.filter((r: any) => !r?.created_at).map((r: any) => r.phone_number)
      if (missingCreatedPhones.length > 0) {
        const { data: createdRows } = await supabase
          .from('leads')
          .select('phone_number, created_at')
          .in('phone_number', missingCreatedPhones)
        const createdMap = new Map((createdRows || []).map((r: any) => [r.phone_number, r.created_at]))
        rows = rows.map((r: any) => ({
          ...r,
          created_at: r.created_at || createdMap.get(r.phone_number) || null,
        }))
      }
      // Construir array tipado de leads incluyendo la fecha de última llamada
      const phoneNumbers = rows.map((l: any) => l.phone_number)
      const lastDates = await getLastCallDates(phoneNumbers)
      const callbackCounts = await getCallbackCounts(phoneNumbers)
      const leadsWithDate: Lead[] = rows.map((lead: any) => ({
        phone_number: lead.phone_number,
        business_name: lead.business_name,
        address: lead.address,
        created_at: lead.created_at || null,
        last_call_date: lastDates[lead.phone_number] ?? null,
        callbacks_count: callbackCounts[lead.phone_number] ?? 0
      }))
      // Aplicar filtro local si el usuario quiere ver sólo leads con callbacks
      let visibleLeads = leadsWithDate
      // Filtro local por lote: comparar prefijo ISO yyyy-mm-dd
      if (loteDate) {
        visibleLeads = visibleLeads.filter(l => {
          const ca = l.created_at
          return typeof ca === 'string' && ca.slice(0, 10) === loteDate
        })
      }
      if (onlyWithCallbacks) {
        visibleLeads = leadsWithDate.filter(l => (l.callbacks_count ?? 0) > 0)
      }
      // Ordenar por fecha si corresponde (aplica sobre los leads visibles)
      if (sortBy === 'last_call_date') {
        visibleLeads.sort((a, b) => {
          if (!a.last_call_date && !b.last_call_date) return 0
          if (!a.last_call_date) return 1
          if (!b.last_call_date) return -1
          return sortOrder === 'asc'
            ? new Date(a.last_call_date).getTime() - new Date(b.last_call_date).getTime()
            : new Date(b.last_call_date).getTime() - new Date(a.last_call_date).getTime()
        })
      } else {
        visibleLeads.sort((a, b) => {
          const aValue = a[sortBy] || ''
          const bValue = b[sortBy] || ''
          return sortOrder === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue))
        })
      }
      setLeads(visibleLeads)
      // Si se aplica el filtro local, ajustar el total mostrado al número visible en la página
      setTotalItems(onlyWithCallbacks ? visibleLeads.length : (count || 0))
      setLoading(false)
    }
    fetchLeads()
  }, [currentPage, search, sortBy, sortOrder, onlyWithCallbacks, loteDate])

  // Filtrar leads por cualquier campo
  // Ya no se filtra en frontend, solo se muestra lo que trae la consulta
  return (
    <div className="min-h-screen bg-theme-surface">
      <Sidebar activeItem="clientes" />
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Clientes" pageTitle="Clientes" />
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
          <div className="p-6 border-b border-theme-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-theme-text-primary">Clientes</h2>
              <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
                {totalItems.toLocaleString()} resultados
              </span>
            </div>
            {/* Filtros en una sola fila: búsqueda, lote y callbacks */}
            <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
              <input
                type="text"
                className="px-3 py-2 border border-theme-border rounded-theme text-sm w-64 bg-theme-surface focus:outline-none focus:ring-2 focus:ring-theme-primary"
                placeholder="Buscar por teléfono o empresa..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {/* Filtro por lote (fecha de created_at) */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-theme-text-primary">Lote</label>
                <input
                  type="date"
                  className="px-3 py-2 border border-theme-border rounded-theme text-sm bg-theme-surface focus:outline-none"
                  value={loteDate}
                  onChange={e => { setLoteDate(e.target.value); setCurrentPage(1); }}
                />
                {loteDate && (
                  <button
                    type="button"
                    className="px-2 py-1 border border-theme-border rounded-theme text-xs text-theme-text-primary hover:bg-theme-surface"
                    onClick={() => { setLoteDate(''); setCurrentPage(1); }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-theme-primary"
                  checked={onlyWithCallbacks}
                  onChange={e => { setOnlyWithCallbacks(e.target.checked); setCurrentPage(1); }}
                />
                <span className="text-theme-text-primary">Solo con callbacks</span>
              </label>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-theme-text-secondary">Cargando clientes...</span>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-theme-text-secondary">
              No se encontraron clientes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-theme-surface-hover sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Teléfono</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Lote</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Empresa</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-56">Dirección</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Última llamada</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-24">Llamadas</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-24">Callbacks</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-theme-surface divide-y divide-theme-border">
                  {leads.map((lead) => (
                    <tr key={lead.phone_number} className="hover:bg-theme-surface-hover transition-colors">
                      <td className="px-2 py-1 align-top break-words">
                        <div className="text-xs font-mono text-theme-text-muted break-words whitespace-normal">{lead.phone_number}</div>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <div className="text-xs text-theme-text-primary break-words whitespace-normal">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <div className="text-xs text-theme-text-primary break-words whitespace-normal">{lead.business_name || 'N/A'}</div>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <div className="text-xs text-theme-text-primary break-words whitespace-normal">{lead.address || 'N/A'}</div>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <div className="text-xs text-theme-text-secondary">{
                          lead.last_call_date
                            ? (() => {
                                const d = new Date(lead.last_call_date)
                                const fecha = d.toLocaleDateString()
                                const hora = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
                                return `${fecha} ${hora}`
                              })()
                            : '-'
                        }</div>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <span className="text-xs"><LlamadasCount phoneNumber={lead.phone_number} /></span>
                      </td>
                      <td className="px-2 py-1 align-top break-words">
                        <span className="text-xs font-semibold text-theme-secondary">{lead.callbacks_count ?? 0}</span>
                      </td>
                      <td className="px-2 py-1 align-top">
                        <button
                          className="inline-flex items-center px-2 py-1 border border-theme-primary text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 rounded-theme text-xs font-medium transition-colors"
                          title="Ver detalles del cliente"
                          onClick={() => window.location.href = `/clientes/${encodeURIComponent(lead.phone_number)}`}
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Paginación */}
          {totalItems > ITEMS_PER_PAGE && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="text-sm text-theme-text-primary">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems} clientes
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
                >
                  Anterior
                </button>
                {/* Números de página compactos con elipsis */}
                {(() => {
                  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
                  const items = getPaginationItems(currentPage, totalPages, 1, 1)
                  return items.map((it, idx) =>
                    it === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-theme-text-muted">…</span>
                    ) : (
                      <button
                        key={`page-${it}`}
                        onClick={() => setCurrentPage(it)}
                        className={`px-2 py-1 rounded-theme text-sm border border-theme-border hover:bg-theme-primary/10 transition-colors ${currentPage === it ? 'bg-theme-primary text-white font-bold' : 'text-theme-text-primary'}`}
                      >
                        {it}
                      </button>
                    )
                  )
                })()}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalItems / ITEMS_PER_PAGE)))}
                  disabled={currentPage === Math.ceil(totalItems / ITEMS_PER_PAGE)}
                  className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-surface"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
