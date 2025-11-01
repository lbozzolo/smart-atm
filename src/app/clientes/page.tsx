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

export default function ClientesPage() {
  type Lead = {
  phone_number: string
  owner_name?: string
  business_name?: string
  address?: string
  last_call_date: string | null
  callbacks_count: number
  }
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<'business_name' | 'owner_name' | 'last_call_date'>('business_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [dispositionFilter, setDispositionFilter] = useState<string>('all')
  const [onlyWithCallbacks, setOnlyWithCallbacks] = useState(false)
  const ITEMS_PER_PAGE = 25

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      let query = supabase
        .from('leads')
        .select('phone_number, owner_name, business_name, address', { count: 'exact' })
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
        query = query.or(`phone_number.ilike.%${search}%,owner_name.ilike.%${search}%,business_name.ilike.%${search}%`)
      }
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)
      const { data, error, count } = await query
      // Construir array tipado de leads incluyendo la fecha de última llamada
      const phoneNumbers = (data || []).map((l: any) => l.phone_number)
      const lastDates = await getLastCallDates(phoneNumbers)
      const callbackCounts = await getCallbackCounts(phoneNumbers)
      const leadsWithDate: Lead[] = (data || []).map((lead: any) => ({
        phone_number: lead.phone_number,
        owner_name: lead.owner_name,
        business_name: lead.business_name,
        address: lead.address,
        last_call_date: lastDates[lead.phone_number] ?? null,
        callbacks_count: callbackCounts[lead.phone_number] ?? 0
      }))
      // Aplicar filtro local si el usuario quiere ver sólo leads con callbacks
      let visibleLeads = leadsWithDate
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
  }, [currentPage, search, sortBy, sortOrder, onlyWithCallbacks])

  // Filtrar leads por cualquier campo
  // Ya no se filtra en frontend, solo se muestra lo que trae la consulta
  return (
    <div className="min-h-screen bg-theme-surface">
      <Sidebar activeItem="clientes" />
      <main className="ml-64 p-8">
        <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm">
          <div className="p-6 border-b border-theme-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-theme-text-primary">Tabla de Clientes</h2>
              <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
                {totalItems.toLocaleString()} resultados
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <button
                className="px-3 py-2 border border-theme-border rounded-theme text-sm bg-theme-surface text-theme-primary hover:bg-theme-primary/10"
                onClick={() => {
                  setSearch("");
                  setSortBy("business_name");
                  setSortOrder("asc");
                  setDispositionFilter("all");
                  setCurrentPage(1);
                }}
                type="button"
              >
                Limpiar filtros
              </button>
              <input
                type="text"
                className="px-3 py-2 border border-theme-border rounded-theme text-sm w-64 bg-theme-surface focus:outline-none focus:ring-2 focus:ring-theme-primary"
                placeholder="Buscar por teléfono, propietario o empresa..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
              <select
                className="px-3 py-2 border border-theme-border rounded-theme text-sm bg-theme-surface focus:outline-none"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="business_name">Empresa</option>
                <option value="owner_name">Propietario</option>
                <option value="last_call_date">Fecha última llamada</option>
              </select>
              <select
                className="px-3 py-2 border border-theme-border rounded-theme text-sm bg-theme-surface focus:outline-none"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
              <select
                className="px-3 py-2 border border-theme-border rounded-theme text-sm bg-theme-surface focus:outline-none"
                value={dispositionFilter}
                onChange={e => { setDispositionFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Todos los estados</option>
                <option value="Exitosa">Exitosa</option>
                <option value="Fallida">Fallida</option>
                <option value="Sin disposition">Sin disposition</option>
              </select>
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
                    <th className="px-4 py-4 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider w-40">Propietario</th>
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
                        <div className="text-xs text-theme-text-primary break-words whitespace-normal">{lead.owner_name || 'N/A'}</div>
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
                {/* Números de página */}
                {Array.from({ length: Math.ceil(totalItems / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded-theme text-sm border border-theme-border hover:bg-theme-primary/10 transition-colors ${currentPage === pageNum ? 'bg-theme-primary text-white font-bold' : 'text-theme-text-primary'}`}
                  >
                    {pageNum}
                  </button>
                ))}
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
