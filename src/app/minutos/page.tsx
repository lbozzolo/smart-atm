'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute, { useAuth } from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { createSupabaseClient } from '@/lib/supabase'
import { getMinutesAllowedEmails, isMinutesAllowed } from '@/lib/minutesAccess'

const LOOKBACK_MONTHS = 6
const MINUTE_COST_USD = 0.21
const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
const numberFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
})
const integerFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})
const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

interface MonthlyMinutes {
  key: string
  label: string
  totalMs: number
}

interface MinutesMetrics {
  totalMs: number
  last30Ms: number
  averageDurationMs: number
  totalCalls: number
  monthly: MonthlyMinutes[]
  rangeFrom: Date
  rangeTo: Date
  isFiltered: boolean
}

const toMinutes = (ms: number) => ms / 60000
const toHours = (ms: number) => ms / 3600000
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const buildUtcDate = (value: string, endOfDay = false) => {
  const base = new Date(`${value}T00:00:00`)
  if (Number.isNaN(base.getTime())) {
    return null
  }

  if (endOfDay) {
    base.setHours(23, 59, 59, 999)
  }

  return base
}

const configuredAllowedEmails = getMinutesAllowedEmails()

function MinutesContent() {
  const { user, loading } = useAuth()
  const allowed = isMinutesAllowed(user?.email)
  const allowedList = useMemo(() => configuredAllowedEmails, [])
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [metrics, setMetrics] = useState<MinutesMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | null>(null)
  const [appliedDateTo, setAppliedDateTo] = useState<string | null>(null)
  const [historicalTotalMs, setHistoricalTotalMs] = useState<number | null>(null)

  const handleApplyFilters = () => {
    setAppliedDateFrom(dateFrom || null)
    setAppliedDateTo(dateTo || null)
  }

  const handleClearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedDateFrom(null)
    setAppliedDateTo(null)
  }

  const loadMetrics = useCallback(async () => {
    if (!allowed) {
      return
    }

    setLoadingMetrics(true)
    setError(null)

    try {
      const endDate = appliedDateTo ? buildUtcDate(appliedDateTo, true) : new Date()
      const resolvedEndDate = endDate ?? new Date()

      let startDate: Date

      if (appliedDateFrom) {
        startDate = buildUtcDate(appliedDateFrom, false) ?? new Date(resolvedEndDate)
      } else if (appliedDateTo) {
        const fallback = new Date(resolvedEndDate)
        fallback.setMonth(fallback.getMonth() - LOOKBACK_MONTHS)
        fallback.setHours(0, 0, 0, 0)
        startDate = fallback
      } else {
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - LOOKBACK_MONTHS)
      }

      startDate.setHours(0, 0, 0, 0)

      if (startDate > resolvedEndDate) {
        setMetrics(null)
        setError('El rango seleccionado no es válido: la fecha inicial es posterior a la fecha final.')
        return
      }

      const startIso = startDate.toISOString()
      const endIso = resolvedEndDate.toISOString()

      const { data: totalRangeData, error: totalRangeError } = await supabase.rpc(
        'sum_pca_duration_ms_between',
        {
          p_start_timestamp: startIso,
          p_end_timestamp: endIso
        }
      )

      if (totalRangeError) {
        throw totalRangeError
      }

      const totalRangeMs = typeof totalRangeData === 'number' ? totalRangeData : 0

      const last30Start = new Date(resolvedEndDate)
      last30Start.setDate(last30Start.getDate() - 30)
      if (last30Start < startDate) {
        last30Start.setTime(startDate.getTime())
      }

      const { data: last30Data, error: last30Error } = await supabase.rpc(
        'sum_pca_duration_ms_between',
        {
          p_start_timestamp: last30Start.toISOString(),
          p_end_timestamp: endIso
        }
      )

      if (last30Error) {
        throw last30Error
      }

      const last30Ms = typeof last30Data === 'number' ? last30Data : 0

      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        'get_pca_duration_monthly',
        {
          p_start_timestamp: startIso,
          p_end_timestamp: endIso
        }
      )

      if (monthlyError) {
        throw monthlyError
      }

      const monthlyRows = Array.isArray(monthlyData)
        ? (monthlyData as Array<{ month_start: string; total_ms: number | null }>)
        : []

      const monthly: MonthlyMinutes[] = monthlyRows.map((entry) => {
        const monthDate = new Date(entry.month_start)
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
        const label = capitalize(monthFormatter.format(monthDate))

        return {
          key,
          label,
          totalMs: entry.total_ms ?? 0
        }
      }).sort((a, b) => (a.key < b.key ? 1 : -1))

      const { count: totalCount, error: countError } = await supabase
        .from('pca')
        .select('id', { head: true, count: 'exact' })
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      if (countError) {
        throw countError
      }

      const totalCalls = totalCount ?? 0
      const averageDurationMs = totalCalls > 0 ? totalRangeMs / totalCalls : 0

      setMetrics({
        totalMs: totalRangeMs,
        last30Ms,
        averageDurationMs,
        totalCalls,
        monthly,
        rangeFrom: startDate,
        rangeTo: resolvedEndDate,
        isFiltered: Boolean(appliedDateFrom || appliedDateTo)
      })
      setLastUpdated(new Date())
    } catch (fetchError) {
      console.error('Error loading minutes metrics', fetchError)
      setError('No pudimos cargar los minutos. Intenta nuevamente más tarde.')
      setMetrics(null)
    } finally {
      setLoadingMetrics(false)
    }
  }, [allowed, appliedDateFrom, appliedDateTo, supabase])

  useEffect(() => {
    if (!allowed) {
      setHistoricalTotalMs(null)
      return
    }

    let isMounted = true

    const fetchHistoricalTotal = async () => {
      try {
        const { data, error } = await supabase.rpc('sum_pca_duration_ms')
        if (!isMounted) {
          return
        }
        if (error) {
          console.error('Error loading historical minutes total', error)
          return
        }
        setHistoricalTotalMs(typeof data === 'number' ? data : 0)
      } catch (rpcError) {
        if (isMounted) {
          console.error('Error loading historical minutes total', rpcError)
        }
      }
    }

    fetchHistoricalTotal()

    return () => {
      isMounted = false
    }
  }, [allowed, supabase])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!allowed) {
      setLoadingMetrics(false)
      setMetrics(null)
      return
    }

    loadMetrics()
  }, [allowed, loadMetrics, loading])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center space-y-4 text-theme-text-secondary">
          <svg className="animate-spin h-8 w-8 text-theme-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Preparando tu panel privado...</span>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto bg-theme-surface border border-theme-border rounded-theme p-8">
        <h2 className="text-2xl font-semibold text-theme-text-primary mb-4">Acceso restringido</h2>
        <p className="text-theme-text-secondary mb-4">
          Esta vista es privada. Asegúrate de que tu correo esté incluido en <code className="px-2 py-1 bg-theme-surface-hover rounded">NEXT_PUBLIC_MINUTES_ALLOWED_EMAILS</code> o en
          <code className="px-2 py-1 bg-theme-surface-hover rounded">NEXT_PUBLIC_MINUTES_DEFAULT_EMAILS</code>.
        </p>
        {allowedList.length > 0 ? (
          <div className="text-sm text-theme-text-muted">
            <p className="mb-2">Correos con acceso actualmente:</p>
            <ul className="list-disc list-inside">
              {allowedList.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-theme-text-muted">
            No hay correos autorizados configurados todavía.
          </p>
        )}
      </div>
    )
  }

  if (loadingMetrics) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center space-y-4 text-theme-text-secondary">
          <svg className="animate-spin h-8 w-8 text-theme-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Calculando minutos consumidos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-theme-error/10 border border-theme-error rounded-theme p-6 text-theme-error">
        <h2 className="text-xl font-semibold mb-2">Hubo un problema</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={loadMetrics}
          className="inline-flex items-center px-4 py-2 bg-theme-error text-white rounded-theme hover:bg-theme-error/90 transition"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  const { totalMs, last30Ms, averageDurationMs, totalCalls, monthly, rangeFrom, rangeTo, isFiltered } = metrics
  const totalCardTitle = isFiltered ? 'Total en el rango seleccionado' : `Total últimos ${LOOKBACK_MONTHS} meses`
  const averageCardTitle = isFiltered ? 'Promedio en el rango seleccionado' : `Promedio últimos ${LOOKBACK_MONTHS} meses`
  const emptyMonthlyMessage = isFiltered ? 'No hay registros en el rango seleccionado.' : `No hay registros en los últimos ${LOOKBACK_MONTHS} meses.`
  const rangeLabel = `${rangeFrom.toLocaleDateString('es-AR')} - ${rangeTo.toLocaleDateString('es-AR')}`
  const totalMinutes = toMinutes(totalMs)
  const totalHours = toHours(totalMs)
  const costForRange = totalMinutes * MINUTE_COST_USD
  const historicalCost = historicalTotalMs !== null ? toMinutes(historicalTotalMs) * MINUTE_COST_USD : null

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text-primary">Minutos consumidos</h1>
          <p className="text-theme-text-secondary">
            Sumatoria directa de <code className="px-1.5 py-0.5 bg-theme-surface-hover rounded">pca.duration_ms</code>.
          </p>
          <p className="text-sm text-theme-text-muted mt-2">
            Rango activo: {rangeLabel}{isFiltered ? '' : ` (últimos ${LOOKBACK_MONTHS} meses por defecto)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-theme-text-muted">
              Actualizado: {lastUpdated.toLocaleString('es-AR')}
            </span>
          )}
          <button
            onClick={loadMetrics}
            className="inline-flex items-center gap-2 px-3 py-2 bg-theme-primary text-white rounded-theme hover:bg-theme-primary/90 transition"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.93 4.93A10 10 0 1121 12h-2a8 8 0 10-2.34-5.66" />
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4v5h5" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-theme-surface border border-theme-border rounded-theme p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-text-secondary">Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="px-3 py-2 bg-theme-background border border-theme-border rounded-lg text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-text-secondary">Hasta:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="px-3 py-2 bg-theme-background border border-theme-border rounded-lg text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 text-sm font-medium text-white bg-theme-primary hover:bg-theme-primary/90 rounded-lg transition-colors shadow-sm"
          >
            Aplicar filtros
          </button>

          {(dateFrom || dateTo || appliedDateFrom || appliedDateTo) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-theme-error hover:bg-theme-error/10 rounded-lg transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-theme-surface border border-theme-border rounded-theme p-6 shadow-sm">
          <p className="text-sm text-theme-text-muted mb-2">{totalCardTitle}</p>
          <p className="text-3xl font-semibold text-theme-text-primary">
            {numberFormatter.format(totalMinutes)} min
          </p>
          <p className="text-sm text-theme-text-secondary mt-2">
            ≈ {numberFormatter.format(totalHours)} horas {isFiltered ? 'en el rango' : 'acumuladas'}
          </p>
          {historicalTotalMs !== null && (
            <p className="text-xs text-theme-text-muted mt-2">
              Histórico completo: {numberFormatter.format(toMinutes(historicalTotalMs))} min (
              {numberFormatter.format(toHours(historicalTotalMs))} h)
              {historicalCost !== null && (
                <span> ≈ {currencyFormatter.format(historicalCost)}</span>
              )}
            </p>
          )}
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-theme p-6 shadow-sm">
          <p className="text-sm text-theme-text-muted mb-2">Costo del rango</p>
          <p className="text-3xl font-semibold text-theme-text-primary">
            {currencyFormatter.format(costForRange)}
          </p>
          <p className="text-sm text-theme-text-secondary mt-2">
            {numberFormatter.format(totalMinutes)} min x {currencyFormatter.format(MINUTE_COST_USD)} por minuto
          </p>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-theme p-6 shadow-sm">
          <p className="text-sm text-theme-text-muted mb-2">Últimos 30 días</p>
          <p className="text-3xl font-semibold text-theme-text-primary">
            {numberFormatter.format(toMinutes(last30Ms))} min
          </p>
          <p className="text-sm text-theme-text-secondary mt-2">
            ≈ {numberFormatter.format(toHours(last30Ms))} horas
          </p>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-theme p-6 shadow-sm">
          <p className="text-sm text-theme-text-muted mb-2">{averageCardTitle}</p>
          <p className="text-3xl font-semibold text-theme-text-primary">
            {numberFormatter.format(toMinutes(averageDurationMs))} min/llamada
          </p>
          <p className="text-sm text-theme-text-secondary mt-2">
            Basado en {integerFormatter.format(totalCalls)} llamadas dentro del rango activo
          </p>
        </div>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-theme p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-theme-text-primary mb-4">Histórico por mes</h2>
        {monthly.length === 0 ? (
          <p className="text-theme-text-secondary">{emptyMonthlyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-theme-surface-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Mes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Minutos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Horas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Costo (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {monthly.map((entry) => {
                  const minutes = toMinutes(entry.totalMs)
                  const hours = toHours(entry.totalMs)
                  const cost = minutes * MINUTE_COST_USD

                  return (
                    <tr key={entry.key} className="hover:bg-theme-surface-hover/60 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-theme-text-primary">{entry.label}</td>
                      <td className="px-4 py-3 text-sm text-theme-text-secondary">{numberFormatter.format(minutes)} min</td>
                      <td className="px-4 py-3 text-sm text-theme-text-secondary">{numberFormatter.format(hours)} h</td>
                      <td className="px-4 py-3 text-sm text-theme-text-secondary">{currencyFormatter.format(cost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MinutesPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-theme-background">
        <Sidebar activeItem="minutos" />
        <Header sidebarCollapsed={sidebarCollapsed} currentPage="Analytics" pageTitle="Minutos consumidos" />
        <main
          className={`
            pt-20 pb-8 px-6 transition-all duration-300
            ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
          `}
        >
          <MinutesContent />
        </main>
      </div>
    </ProtectedRoute>
  )
}
