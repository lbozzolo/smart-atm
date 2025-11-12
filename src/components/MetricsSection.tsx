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
  const [totalPcaMs, setTotalPcaMs] = useState(0)
  const [totalCallsCount, setTotalCallsCount] = useState<number | null>(null)
  const [successfulCallsCount, setSuccessfulCallsCount] = useState<number>(0)
  const [avgAmount, setAvgAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Obtener conteo exacto de llamadas (para evitar límites por página)
        try {
          const { count: callsCount, error: callsCountError } = await supabase
            .from('calls')
            .select('call_id', { head: true, count: 'exact' })

          if (!callsCountError) {
            setTotalCallsCount(callsCount || 0)
            console.log('📞 Total de llamadas (conteo exacto):', callsCount)
          } else {
            console.warn('Warning fetching exact calls count:', callsCountError)
          }
        } catch (err) {
          console.warn('Warning: could not fetch exact calls count', err)
        }

        // Obtener callbacks de la tabla callbacks (conteo exacto)
        try {
          const { count: callbacksCount, error: callbacksCountError } = await supabase
            .from('callbacks')
            .select('id', { head: true, count: 'exact' })

          if (!callbacksCountError) {
            setTotalCallbacks(callbacksCount || 0)
            console.log('📞 Total callbacks encontrados en tabla callbacks:', callbacksCount)
          } else {
            console.warn('Warning fetching exact callbacks count:', callbacksCountError)
            setTotalCallbacks(0)
          }
        } catch (err) {
          console.warn('Warning: could not fetch exact callbacks count', err)
          setTotalCallbacks(0)
        }

        // Obtener suma de duration_ms desde el servidor usando RPC para evitar problemas de paginación
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('sum_pca_duration_ms')
          if (rpcError) {
            console.warn('RPC sum_pca_duration_ms not available or error:', rpcError)
            // Fallback: traer hasta 10000 filas de pca.duration_ms y sumar en cliente
            try {
              const { data: pcaData, error: pcaError } = await supabase
                .from('pca')
                .select('duration_ms')
                .limit(10000)

              if (pcaError) {
                console.error('Error fetching PCA (fallback):', pcaError)
                setTotalPcaMs(0)
              } else {
                const totalMs = (pcaData || []).reduce((sum, pca) => sum + (pca.duration_ms || 0), 0)
                setTotalPcaMs(totalMs)
              }
            } catch (err2) {
              console.error('Fallback fetch error:', err2)
              setTotalPcaMs(0)
            }
          } else {
            // supabase-js puede devolver el valor como número simple o como array; normalizamos
            let totalMs = 0
            if (Array.isArray(rpcData)) {
              // try first element
              totalMs = Number(rpcData[0]) || 0
            } else {
              totalMs = Number(rpcData) || 0
            }
            setTotalPcaMs(totalMs)
          }
        } catch (err) {
          console.error('Exception calling RPC sum_pca_duration_ms:', err)
          // último recurso: intentar traer algunas filas
          try {
            const { data: pcaData2, error: pcaErr2 } = await supabase.from('pca').select('duration_ms').limit(10000)
            if (pcaErr2) {
              console.error('Error fetching PCA final fallback:', pcaErr2)
              setTotalPcaMs(0)
            } else {
              const totalMs = (pcaData2 || []).reduce((sum, pca) => sum + (pca.duration_ms || 0), 0)
              setTotalPcaMs(totalMs)
            }
          } catch (err2) {
            console.error('Final fallback failed:', err2)
            setTotalPcaMs(0)
          }
        }
        // Obtener conteo de llamadas con agreed_amount > 0 (éxitos)
        try {
          const { count: successCount, error: successCountErr } = await supabase
            .from('calls')
            .select('agreed_amount', { head: true, count: 'exact' })
            .gt('agreed_amount', 0)

          if (!successCountErr) {
            setSuccessfulCallsCount(successCount || 0)
          }
        } catch (err) {
          console.warn('Warning fetching successful calls count:', err)
          setSuccessfulCallsCount(0)
        }

        // Obtener muestra para calcular promedio de agreed_amount (limitar para no traer todo)
        try {
          const { data: agreedRows, error: agreedErr } = await supabase
            .from('calls')
            .select('agreed_amount')
            .gt('agreed_amount', 0)
            .limit(10000)

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
  }, [])

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
  // Calcular minutos totales consumidos usando todos los PCA
  const totalMinutes = Math.round(totalPcaMs / 1000 / 60)

  const successRate = totalCalls > 0 ? ((successfulCallsCount / totalCalls) * 100).toFixed(1) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total de Llamadas"
        value={
          <>
            {totalCalls.toLocaleString()}
            <span className="text-xs text-theme-text-muted ml-2 align-middle">
              ({totalMinutes.toLocaleString()} min)
            </span>
          </>
        }
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
        title="Llamadas con Venta"
        value={`${successRate}%`}
        change={`${successfulCallsCount} con monto acordado`}
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
  )
}