'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPCAInfo, type CallWithPCAInfo } from '@/lib/supabase'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ title, value, change, icon, color, trend = 'neutral' }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-500/20',
    green: 'from-green-500 to-green-600 border-green-500/20',
    purple: 'from-purple-500 to-purple-600 border-purple-500/20',
    orange: 'from-orange-500 to-orange-600 border-orange-500/20',
    red: 'from-red-500 to-red-600 border-red-500/20'
  }

  const trendColors = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-slate-600 bg-slate-100'
  }

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
        {change && (
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>
            <span className="mr-1">{trendIcons[trend]}</span>
            {change}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-slate-600 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function MetricsSection() {
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await getCallsWithPCAInfo()
        setCalls(data)
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
  const callsWithPCA = calls.filter(call => call.hasPCA).length
  const successfulCalls = calls.filter(call => call.disposition === 'successful').length
  const avgAmount = calls
    .filter(call => call.agreed_amount && call.agreed_amount > 0)
    .reduce((sum, call) => sum + (call.agreed_amount || 0), 0) / 
    calls.filter(call => call.agreed_amount && call.agreed_amount > 0).length || 0

  const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0
  const analysisRate = totalCalls > 0 ? ((callsWithPCA / totalCalls) * 100).toFixed(1) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total de Llamadas"
        value={totalCalls.toLocaleString()}
        change="+12%"
        icon="📞"
        color="blue"
        trend="up"
      />
      
      <MetricCard
        title="Tasa de Éxito"
        value={`${successRate}%`}
        change="+5.2%"
        icon="✅"
        color="green"
        trend="up"
      />
      
      <MetricCard
        title="Con Análisis"
        value={`${analysisRate}%`}
        change={`${callsWithPCA}/${totalCalls}`}
        icon="📊"
        color="purple"
        trend="neutral"
      />
      
      <MetricCard
        title="Monto Promedio"
        value={avgAmount > 0 ? `$${Math.round(avgAmount).toLocaleString()}` : 'N/A'}
        change="-2.1%"
        icon="💰"
        color="orange"
        trend="down"
      />
    </div>
  )
}