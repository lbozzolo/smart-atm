'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BillingStat {
  month: string
  total_calls: number
  total_cost: number
}

export default function BillingTable() {
  const [stats, setStats] = useState<BillingStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBillingStats() {
      try {
        // Try RPC first
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_monthly_billing_stats')
        
        if (!rpcError && rpcData) {
          setStats(rpcData)
        } else {
          console.warn('RPC get_monthly_billing_stats failed, falling back to client-side calculation', rpcError)
          
          // Fallback: Fetch all created_at dates
          const allDates: string[] = []
          let hasMore = true
          let page = 0
          const pageSize = 1000
          
          while (hasMore) {
             const { data, error } = await supabase
              .from('calls')
              .select('created_at')
              .range(page * pageSize, (page + 1) * pageSize - 1)
              .order('created_at', { ascending: false })
            
            if (error) {
                console.error('Error fetching calls for billing:', error)
                break
            }
            
            if (data && data.length > 0) {
                data.forEach(d => {
                    if (d.created_at) allDates.push(d.created_at)
                })
                if (data.length < pageSize) hasMore = false
            } else {
                hasMore = false
            }
            page++
            
            // Safety break
            if (page > 50) break; 
          }

          // Group by month
          const grouped = allDates.reduce((acc, dateStr) => {
            const month = dateStr.substring(0, 7) // YYYY-MM
            if (!acc[month]) {
              acc[month] = 0
            }
            acc[month]++
            return acc
          }, {} as Record<string, number>)

          const calculatedStats = Object.entries(grouped)
            .map(([month, count]) => ({
              month,
              total_calls: count,
              total_cost: count * 0.21
            }))
            .sort((a, b) => b.month.localeCompare(a.month))

          setStats(calculatedStats)
        }
      } catch (error) {
        console.error('Error loading billing stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingStats()
  }, [])

  if (loading) {
    return (
      <div className="w-full p-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
      </div>
    )
  }

  return (
    <div className="bg-theme-surface rounded-2xl border border-theme-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-theme-surface-hover border-b border-theme-border">
              <th className="py-4 px-6 text-sm font-semibold text-theme-text-secondary">Período</th>
              <th className="py-4 px-6 text-sm font-semibold text-theme-text-secondary text-right">Total Minutos</th>
              <th className="py-4 px-6 text-sm font-semibold text-theme-text-secondary text-right">Costo Total (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {stats.map((stat) => (
              <tr key={stat.month} className="hover:bg-theme-surface-hover/50 transition-colors">
                <td className="py-4 px-6 text-sm font-medium text-theme-text-primary capitalize">
                  {new Date(stat.month + '-02').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                </td>
                <td className="py-4 px-6 text-sm text-theme-text-primary text-right font-mono">
                  {stat.total_calls.toLocaleString()}
                </td>
                <td className="py-4 px-6 text-sm text-theme-text-primary text-right font-mono font-medium text-theme-success">
                  ${stat.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-theme-text-muted">
                  No hay datos de facturación disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
