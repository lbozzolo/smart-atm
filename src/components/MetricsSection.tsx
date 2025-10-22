'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPCAInfo, type CallWithPCAInfo, supabase } from '@/lib/supabase'

interface MetricCardProps {
  title: string
  value: string | number
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
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [totalCallbacks, setTotalCallbacks] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Obtener llamadas
        const callsData = await getCallsWithPCAInfo()
        setCalls(callsData)
        
        // Obtener callbacks de la tabla callbacks
        const { data: callbacksData, error } = await supabase
          .from('callbacks')
          .select('id')
        
        if (error) {
          console.error('Error fetching callbacks:', error)
          setTotalCallbacks(0)
        } else {
          setTotalCallbacks(callbacksData?.length || 0)
          console.log('📞 Total callbacks encontrados en tabla callbacks:', callbacksData?.length || 0)
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
  const totalCalls = calls.length
  
  // Debug: ver qué dispositions realmente existen
  const uniqueDispositions = [...new Set(calls.map(call => call.disposition).filter(Boolean))]
  const dispositionsWithNulls = calls.map(call => call.disposition)
  
  console.log('🔍 Dispositions únicos encontrados:', uniqueDispositions)
  console.log('🔍 Todos los dispositions (incluyendo nulls):', dispositionsWithNulls)
  console.log('🔍 Cuántos dispositions son null/undefined:', dispositionsWithNulls.filter(d => !d).length)
  console.log('📊 Total de llamadas:', totalCalls)
  console.log('📞 Total de callbacks (tabla callbacks):', totalCallbacks)
  
  // TEMPORAL: Usar agreed_amount como indicador de éxito ya que disposition está vacío
  const successfulCalls = calls.filter(call => 
    call.agreed_amount && call.agreed_amount > 0
  ).length
  
  console.log('💰 Usando agreed_amount como indicador de éxito')
  console.log('💰 Llamadas con monto acordado (exitosas):', successfulCalls)
  
  console.log('✅ Llamadas con venta encontradas:', successfulCalls)
  
  // Mostrar todas las llamadas con sus dispositions para debug
  console.log('📋 Muestra de la primera llamada:', calls[0])
  console.log('📋 Campos de disposition de las primeras 5 llamadas:', calls.slice(0, 5).map(call => ({
    call_id: call.call_id,
    disposition: call.disposition,
    disposition_type: typeof call.disposition,
    disposition_value: JSON.stringify(call.disposition),
    all_keys: Object.keys(call)
  })))
  
  const avgAmount = calls
    .filter(call => call.agreed_amount && call.agreed_amount > 0)
    .reduce((sum, call) => sum + (call.agreed_amount || 0), 0) / 
    calls.filter(call => call.agreed_amount && call.agreed_amount > 0).length || 0

  const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total de Llamadas"
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
        title="Llamadas con Venta"
        value={`${successRate}%`}
        change={`${successfulCalls} con monto acordado`}
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
        change={calls.filter(call => call.agreed_amount && call.agreed_amount > 0).length > 0 
          ? `${calls.filter(call => call.agreed_amount && call.agreed_amount > 0).length} con montos` 
          : 'Sin montos registrados'}
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