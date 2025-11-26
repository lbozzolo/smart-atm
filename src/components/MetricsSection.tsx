'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MetricCardProps {
  title: string
  value: React.ReactNode
  change?: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'accent' | 'warning' | 'error'
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ title, value, change, icon, color, trend = 'neutral' }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-theme-primary',
    success: 'bg-theme-success',
    accent: 'bg-theme-accent',
    warning: 'bg-theme-warning',
    error: 'bg-theme-error'
  }

  const trendColors = {
    up: 'text-theme-success bg-theme-success/10',
    down: 'text-theme-error bg-theme-error/10',
    neutral: 'text-theme-text-muted bg-theme-surface-hover'
  }

  const trendIcons = {
    up: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7m0 0H7" />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10m0 0h10" />
      </svg>
    ),
    neutral: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    )
  }

  return (
    <div className="bg-theme-surface rounded-2xl border border-theme-border p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
        {change && (
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${trendColors[trend]} flex items-center space-x-1`}>
            <span>{trendIcons[trend]}</span>
            <span>{change}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-theme-text-secondary text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-theme-text-primary">{value}</p>
      </div>
    </div>
  )
}

export default function MetricsSection() {
  const [totalCallbacks, setTotalCallbacks] = useState(0)
  const [totalCallsCount, setTotalCallsCount] = useState<number | null>(null)
  const [successfulCallsCount, setSuccessfulCallsCount] = useState<number>(0)
  const [avgAmount, setAvgAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  
  // Estados para los inputs (selección temporal)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  
  // Estados para la query actual (filtros aplicados)
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('')
  const [appliedDateTo, setAppliedDateTo] = useState<string>('')

  const handleApplyFilters = () => {
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
  }

  const handleClearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
  }

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)
        
        // Obtener conteo exacto de llamadas
        try {
          let query = supabase
            .from('calls')
            .select('call_id', { head: true, count: 'exact' })
          
          if (appliedDateFrom) query = query.gte('created_at', appliedDateFrom)
          if (appliedDateTo) query = query.lte('created_at', appliedDateTo)

          const { count: callsCount, error: callsCountError } = await query

          if (!callsCountError) {
            setTotalCallsCount(callsCount || 0)
          } else {
            console.warn('Warning fetching exact calls count:', callsCountError)
          }
        } catch (err) {
          console.warn('Warning: could not fetch exact calls count', err)
        }

        // Obtener callbacks de la tabla callbacks
        try {
          let query = supabase
            .from('callbacks')
            .select('id', { head: true, count: 'exact' })
          
          if (appliedDateFrom) query = query.gte('created_at', appliedDateFrom)
          if (appliedDateTo) query = query.lte('created_at', appliedDateTo)

          const { count: callbacksCount, error: callbacksCountError } = await query

          if (!callbacksCountError) {
            setTotalCallbacks(callbacksCount || 0)
          } else {
            console.warn('Warning fetching exact callbacks count:', callbacksCountError)
            setTotalCallbacks(0)
          }
        } catch (err) {
          console.warn('Warning: could not fetch exact callbacks count', err)
          setTotalCallbacks(0)
        }

        // Obtener conteo de llamadas con agreed_amount > 0 (éxitos)
        try {
          let query = supabase
            .from('calls')
            .select('agreed_amount', { head: true, count: 'exact' })
            .gt('agreed_amount', 0)
          
          if (appliedDateFrom) query = query.gte('created_at', appliedDateFrom)
          if (appliedDateTo) query = query.lte('created_at', appliedDateTo)

          const { count: successCount, error: successCountErr } = await query

          if (!successCountErr) {
            setSuccessfulCallsCount(successCount || 0)
          }
        } catch (err) {
          console.warn('Warning fetching successful calls count:', err)
          setSuccessfulCallsCount(0)
        }

        // Obtener muestra para calcular promedio de agreed_amount
        try {
          let query = supabase
            .from('calls')
            .select('agreed_amount')
            .gt('agreed_amount', 0)
            .limit(10000)
          
          if (appliedDateFrom) query = query.gte('created_at', appliedDateFrom)
          if (appliedDateTo) query = query.lte('created_at', appliedDateTo)

          const { data: agreedRows, error: agreedErr } = await query

          if (!agreedErr && Array.isArray(agreedRows) && agreedRows.length > 0) {
            const total = agreedRows.reduce((sum: number, r: any) => sum + (r.agreed_amount || 0), 0)
            setAvgAmount(total / agreedRows.length)
          } else {
            setAvgAmount(0)
          }
        } catch (err) {
          console.warn('Warning fetching agreed_amount rows:', err)
          setAvgAmount(0)
        }

      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [appliedDateFrom, appliedDateTo])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
              <div className="w-16 h-6 bg-slate-200 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="w-24 h-4 bg-slate-200 rounded"></div>
              <div className="w-16 h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Calcular métricas
  const totalCalls = totalCallsCount ?? 0
  
  // Costo total: 0.21 USD por llamada
  const totalCost = totalCalls * 0.21

  const successRate = totalCalls > 0 ? ((successfulCallsCount / totalCalls) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6 mb-8">
      <div className="flex flex-wrap items-center gap-4 bg-theme-surface p-4 rounded-xl border border-theme-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-text-secondary">Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-theme-bg border border-theme-border rounded-lg text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-text-secondary">Hasta:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-theme-bg border border-theme-border rounded-lg text-sm text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de minutos consumidos"
          value={totalCalls.toLocaleString()}
          change={`Datos actuales`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
          color="primary"
          trend="neutral"
        />
        
        <MetricCard
          title="Costo total"
          value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`$0.21 por minuto`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          color="success"
          trend="neutral"
        />
        
        <MetricCard
          title="Callbacks Programados"
          value={totalCallbacks.toLocaleString()}
          change={totalCallbacks === 1 ? '1 callback registrado' : `${totalCallbacks} callbacks registrados`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="accent"
          trend="neutral"
        />
        
        <MetricCard
          title="Monto Promedio"
          value={avgAmount > 0 ? `$${Math.round(avgAmount).toLocaleString()}` : 'N/A'}
          change={successfulCallsCount > 0 ? `${successfulCallsCount} con montos` : 'Sin montos registrados'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          color="warning"
          trend="neutral"
        />
      </div>
    </div>
  )
}