"use client"

import { useEffect, useState } from 'react'
import { getCallsWithPagination, supabase, type CallWithPCAInfo } from '@/lib/supabase'
import DISPOSITIONS from '@/config/dispositions'

function formatDateShort(d?: string) {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('es-ES')
  } catch {
    return d
  }
}

function normalizePhone(raw?: string) {
  if (!raw) return ''
  try {
    return String(raw).replace(/\D/g, '')
  } catch {
    return String(raw)
  }
}

function downloadCsv(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => {
    const val = r[k]
    if (val === null || typeof val === 'undefined') return ''
    const s = String(val).replace(/"/g, '""')
    return `"${s}"`
  }).join(','))).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportSection() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // dispositions to omit from the query (user can select multiple)
  // Use the central dispositions list from dispositions.ts as single source of truth
  const [omitDispositions, setOmitDispositions] = useState<string[]>([])
  const [minCalls, setMinCalls] = useState<number | ''>('')
  const [omitCallbacks, setOmitCallbacks] = useState(false)

  // previewRows will be leads-centric rows
  type LeadRow = {
    phone_number: string
    business_name?: string
    address?: string
    customer_phone?: string
    timezone?: string
    calls_count?: number
    last_call_date?: string
  }
  const [previewRows, setPreviewRows] = useState<LeadRow[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  // debug metrics to help diagnose minCalls issues
  const [debugCallsFetched, setDebugCallsFetched] = useState(0)
  const [debugDistinctCalledNumbers, setDebugDistinctCalledNumbers] = useState(0)
  const [debugLeadsPassingMinCalls, setDebugLeadsPassingMinCalls] = useState(0)

  // construir filtros y previsualizar
  const handlePreview = async (newPage = 1) => {
    setLoading(true)
    try {
      // 1) Fetch ALL calls (no limit initially, or apply date filter directly to reduce dataset)
      // Order by created_at DESC to get most recent calls first
      let callsQuery = supabase
        .from('calls')
        .select('call_id,to_number,created_at')
        .order('created_at', { ascending: false })
      
      // Apply date filter to calls query directly if provided
      if (dateFrom) callsQuery = callsQuery.gte('created_at', dateFrom)
      if (dateTo) callsQuery = callsQuery.lte('created_at', `${dateTo}T23:59:59.999Z`)
      
      const { data: callsRows } = await callsQuery.limit(100000)
      let calls = Array.isArray(callsRows) ? callsRows : []
      
      // Build maps: counts for all calls, last call date, and unique phone numbers
      const counts = new Map<string, number>()
      const lastCallDates = new Map<string, string>()
      const uniquePhones = new Set<string>()
      
      for (const c of calls) {
        const phone = normalizePhone(c.to_number || '')
        if (!phone) continue
        
        uniquePhones.add(phone)
        counts.set(phone, (counts.get(phone) || 0) + 1)
        
        const currentDate = c.created_at
        const existingDate = lastCallDates.get(phone)
        if (!existingDate || (currentDate && currentDate > existingDate)) {
          lastCallDates.set(phone, currentDate)
        }
      }
      
      setDebugCallsFetched(calls.length)
      setDebugDistinctCalledNumbers(uniquePhones.size)

      // 2) Traer callbacks (solo to_number) si necesitamos omitir leads con callbacks
      let callbacksNumbers: string[] = []
      if (omitCallbacks) {
        const { data: cbRows } = await supabase.from('callbacks').select('to_number')
        callbacksNumbers = Array.isArray(cbRows)
          ? Array.from(new Set(cbRows.map((r: any) => normalizePhone(r.to_number)).filter(Boolean)))
          : []
      }

      // 3) Si el usuario seleccionó dispositions a omitir, traer los números
      // directamente desde PCA (pca.to_number) y construir phonesToExclude.
      let phonesToExclude = new Set<string>()
      if (omitDispositions.length > 0) {
        const { data: pcaRows } = await supabase
          .from('pca')
          .select('to_number,created_at')
          .in('disposition', omitDispositions)
        const nums = Array.isArray(pcaRows) ? pcaRows.map((r: any) => normalizePhone(r.to_number)).filter(Boolean) : []
        phonesToExclude = new Set(nums)
      }

      // 4) Get unique phone numbers after applying filters
      let filteredPhones = Array.from(uniquePhones)

      if (omitCallbacks) {
        filteredPhones = filteredPhones.filter(phone => !callbacksNumbers.includes(phone))
      }

      if (phonesToExclude.size > 0) {
        filteredPhones = filteredPhones.filter(phone => !phonesToExclude.has(phone))
      }

      if (typeof minCalls === 'number' && minCalls > 0) {
        filteredPhones = filteredPhones.filter(phone => (counts.get(phone) || 0) === minCalls)
      }

      // 5) Fetch lead info for these phone numbers from leads table
      const { data: leadsData } = await supabase
        .from('leads')
        .select('phone_number, business_name, timezone')
        .in('phone_number', filteredPhones.length > 0 ? filteredPhones : ['__NO_MATCH__'])
      
      const leadsMap = new Map<string, any>()
      if (Array.isArray(leadsData)) {
        for (const lead of leadsData) {
          leadsMap.set(normalizePhone(lead.phone_number), lead)
        }
      }

      // 6) Build final lead rows with call data
      const leadRows: LeadRow[] = filteredPhones.map(phone => {
        const leadInfo = leadsMap.get(phone)
        return {
          phone_number: leadInfo?.phone_number || phone,
          business_name: leadInfo?.business_name || '',
          address: '',
          customer_phone: leadInfo?.phone_number || phone,
          timezone: leadInfo?.timezone || '',
          calls_count: counts.get(phone) || 0,
          last_call_date: lastCallDates.get(phone)
        }
      })

      // Ordenar por fecha de última llamada (más reciente primero)
      leadRows.sort((a, b) => {
        if (!a.last_call_date && !b.last_call_date) return 0
        if (!a.last_call_date) return 1
        if (!b.last_call_date) return -1
        return new Date(b.last_call_date).getTime() - new Date(a.last_call_date).getTime()
      })

      const totalResults = leadRows.length
      setTotal(totalResults)
      setTotalPages(Math.ceil(totalResults / limit) || 1)
      setPage(newPage)

      const start = (newPage - 1) * limit
      const end = start + limit
  setPreviewRows(leadRows.slice(start, end))
  setDebugLeadsPassingMinCalls(leadRows.filter(r => typeof minCalls === 'number' && minCalls > 0 ? (r.calls_count || 0) === minCalls : true).length)
    } catch (err) {
      console.error('Error previewing export:', err)
      setPreviewRows([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      // 1) Fetch calls with date filter applied directly
      let callsQuery = supabase
        .from('calls')
        .select('call_id,to_number,created_at')
        .order('created_at', { ascending: false })
      
      if (dateFrom) callsQuery = callsQuery.gte('created_at', dateFrom)
      if (dateTo) callsQuery = callsQuery.lte('created_at', `${dateTo}T23:59:59.999Z`)
      
      const { data: callsRows } = await callsQuery.limit(100000)
      let calls = Array.isArray(callsRows) ? callsRows : []

      const counts = new Map<string, number>()
      const uniquePhones = new Set<string>()
      
      for (const c of calls) {
        const phone = normalizePhone(c.to_number || '')
        if (!phone) continue
        uniquePhones.add(phone)
        counts.set(phone, (counts.get(phone) || 0) + 1)
      }

      // 2) callbacks numbers (only needed if we will omit leads with callbacks)
      let callbacksNumbers: string[] = []
      if (omitCallbacks) {
        const { data: cbRows } = await supabase.from('callbacks').select('to_number')
        callbacksNumbers = Array.isArray(cbRows)
          ? Array.from(new Set(cbRows.map((r: any) => normalizePhone(r.to_number)).filter(Boolean)))
          : []
      }

      // 3) Si el usuario seleccionó dispositions a omitir, traer los números
      // desde PCA (pca.to_number) y construir phonesToExclude para filtrar
      // leads completos.
      let phonesToExclude = new Set<string>()
      if (omitDispositions.length > 0) {
        const { data: pcaRows } = await supabase
          .from('pca')
          .select('to_number,created_at')
          .in('disposition', omitDispositions)
        const nums = Array.isArray(pcaRows) ? pcaRows.map((r: any) => normalizePhone(r.to_number)).filter(Boolean) : []
        phonesToExclude = new Set(nums)
      }

      // 4) Filter phones
      let filteredPhones = Array.from(uniquePhones)
      if (omitCallbacks) filteredPhones = filteredPhones.filter(phone => !callbacksNumbers.includes(phone))
      if (phonesToExclude.size > 0) filteredPhones = filteredPhones.filter(phone => !phonesToExclude.has(phone))
      if (typeof minCalls === 'number' && minCalls > 0) filteredPhones = filteredPhones.filter(phone => (counts.get(phone) || 0) === minCalls)

      // 5) Fetch lead info
      const { data: leadsData } = await supabase
        .from('leads')
        .select('phone_number, business_name, timezone')
        .in('phone_number', filteredPhones.length > 0 ? filteredPhones : ['__NO_MATCH__'])
      
      const leadsMap = new Map<string, any>()
      if (Array.isArray(leadsData)) {
        for (const lead of leadsData) {
          leadsMap.set(normalizePhone(lead.phone_number), lead)
        }
      }

      // Build CSV rows with the exact columns required by the user.
      // Columns (in this order):
      // - "phone number"  (value from leads.phone_number)
      // - business_name     (from leads.business_name)
      // - customer_phone    (same value as phone number)
      // - timezone          (from leads.timezone)
      const csvRows = filteredPhones.map(phone => {
        const leadInfo = leadsMap.get(phone)
        return {
          'phone number': leadInfo?.phone_number || phone,
          business_name: leadInfo?.business_name || '',
          customer_phone: leadInfo?.phone_number || phone,
          timezone: leadInfo?.timezone || ''
        }
      })

      downloadCsv(`leads_export_${new Date().toISOString()}.csv`, csvRows)
    } catch (err) {
      console.error('Error exporting CSV:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial preview (optional): none
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-theme-surface p-6 rounded-2xl border border-theme-border">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-theme-text-muted">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs text-theme-text-muted">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs text-theme-text-muted">Omitir dispositions</label>
              <div className="grid grid-cols-1 gap-1 mt-2">
                {DISPOSITIONS.map(d => (
                  <label key={d} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={omitDispositions.includes(d)}
                      onChange={(e) => {
                        if (e.target.checked) setOmitDispositions(prev => [...prev, d])
                        else setOmitDispositions(prev => prev.filter(x => x !== d))
                      }}
                    />
                    <span className="text-theme-text-muted">{d}</span>
                  </label>
                ))}
              </div>
          </div>
          <div>
            <label className="block text-xs text-theme-text-muted">Cantidad exacta de llamadas por número</label>
            <input type="number" min={0} value={minCalls as any} onChange={(e) => setMinCalls(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={omitCallbacks} onChange={(e) => setOmitCallbacks(e.target.checked)} />
              <span className="text-xs text-theme-text-muted">Omitir llamadas con callbacks agendados</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button onClick={() => handlePreview(1)} className="px-4 py-2 bg-theme-primary text-white rounded">Previsualizar</button>
          <button onClick={handleExport} className="px-4 py-2 border rounded">Exportar CSV</button>
        </div>
        <div className="mt-4 text-xs text-theme-text-muted">
          <div>Debug: llamadas fetcheadas: {debugCallsFetched}</div>
          <div>Números distintos en llamadas: {debugDistinctCalledNumbers}</div>
          <div>Leads que pasan minCalls: {debugLeadsPassingMinCalls}</div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-theme-surface p-6 rounded-2xl border border-theme-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Previsualización ({total.toLocaleString()})</h3>
          <div className="text-sm text-theme-text-muted">Página {page} / {totalPages}</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
                <tr className="text-left text-theme-text-muted">
                  <th className="px-2 py-2">Nro de teléfono</th>
                  <th className="px-2 py-2">Negocio</th>
                  <th className="px-2 py-2">Dirección</th>
                  <th className="px-2 py-2">Nro Comercio</th>
                  <th className="px-2 py-2">Timezone</th>
                  <th className="px-2 py-2">Cantidad llamadas</th>
                  <th className="px-2 py-2">Última llamada</th>
                </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center">Cargando...</td></tr>
              ) : previewRows.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center">No hay resultados. Haz click en Previsualizar.</td></tr>
                ) : previewRows.map((r) => (
                  <tr key={r.phone_number} className="border-t">
                    <td className="px-2 py-2 font-mono">{r.phone_number}</td>
                    <td className="px-2 py-2">{r.business_name || '-'}</td>
                    <td className="px-2 py-2">{r.address || '-'}</td>
                    <td className="px-2 py-2">{r.customer_phone || '-'}</td>
                    <td className="px-2 py-2">{r.timezone || '-'}</td>
                    <td className="px-2 py-2">{r.calls_count ?? 0}</td>
                    <td className="px-2 py-2">{r.last_call_date ? formatDateShort(r.last_call_date) : '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <button disabled={page <= 1} onClick={() => handlePreview(page - 1)} className="px-3 py-1 border rounded mr-2">Anterior</button>
            <button disabled={page >= totalPages} onClick={() => handlePreview(page + 1)} className="px-3 py-1 border rounded">Siguiente</button>
          </div>
          <div className="text-sm text-theme-text-muted">Mostrando {previewRows.length} registros</div>
        </div>
      </div>
    </div>
  )
}
