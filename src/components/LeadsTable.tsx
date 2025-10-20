'use client'

import { useState, useEffect } from 'react'
import { Lead, getLeads, getCallHistoryByPhone, Call, CallInteraction } from '@/lib/supabase'

interface LeadsTableProps {
  onCallSelect?: (call: Call) => void
}

export default function LeadsTable({ onCallSelect }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())
  const [leadHistory, setLeadHistory] = useState<Map<string, CallInteraction[]>>(new Map())
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getLeads()
      setLeads(data)
    } catch (err) {
      console.error('Error loading leads:', err)
      setError('Error al cargar los leads')
    } finally {
      setLoading(false)
    }
  }

  const toggleLeadExpansion = async (phoneNumber: string) => {
    const newExpanded = new Set(expandedLeads)
    
    if (expandedLeads.has(phoneNumber)) {
      // Contraer
      newExpanded.delete(phoneNumber)
    } else {
      // Expandir y cargar historial si no está cargado
      newExpanded.add(phoneNumber)
      
      if (!leadHistory.has(phoneNumber)) {
        setLoadingHistory(prev => new Set(prev).add(phoneNumber))
        try {
          const history = await getCallHistoryByPhone(phoneNumber)
          setLeadHistory(prev => new Map(prev).set(phoneNumber, history))
        } catch (err) {
          console.error('Error loading call history:', err)
        } finally {
          setLoadingHistory(prev => {
            const newSet = new Set(prev)
            newSet.delete(phoneNumber)
            return newSet
          })
        }
      }
    }
    
    setExpandedLeads(newExpanded)
  }

  const getDispositionBadge = (disposition?: string) => {
    if (!disposition) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Sin disposition</span>

    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    let colorClasses = ""
    
    switch (disposition?.toLowerCase()) {
      // Dispositions positivos (verde)
      case 'new_lead':
      case 'interested':
      case 'successful':
      case 'success':
      case 'sale':
      case 'converted':
        colorClasses = 'bg-green-100 text-green-800'
        break
      
      // Dispositions de seguimiento (azul)
      case 'callback':
      case 'follow_up':
      case 'scheduled':
      case 'reschedule':
      case 'voicemail':
        colorClasses = 'bg-blue-100 text-blue-800'
        break
      
      // Dispositions de no contacto (amarillo)
      case 'owner_not_present':
      case 'no_answer':
      case 'busy':
      case 'unavailable':
        colorClasses = 'bg-yellow-100 text-yellow-800'
        break
      
      // Dispositions negativos (rojo)
      case 'not_interested':
      case 'failed':
      case 'failure':
      case 'rejected':
      case 'wrong_number':
        colorClasses = 'bg-red-100 text-red-800'
        break
      
      // Dispositions pendientes (púrpura)
      case 'pending':
      case 'in_progress':
      case 'processing':
        colorClasses = 'bg-purple-100 text-purple-800'
        break
      
      // Default (gris)
      default:
        colorClasses = 'bg-slate-100 text-slate-600'
        break
    }

    return (
      <span className={`${baseClasses} ${colorClasses}`}>
        {disposition}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-slate-600">Cargando leads...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadLeads}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Leads</h2>
            <p className="text-slate-600 mt-1">Gestiona los prospectos y su historial de llamadas</p>
          </div>
          <div className="text-sm text-slate-600">
            Total: {leads.length} leads
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocio
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Llamadas
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disposition
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <>
                  <tr 
                    key={lead.phone_number} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleLeadExpansion(lead.phone_number)}
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expandedLeads.has(lead.phone_number) ? (
                        <span className="inline-block w-5 h-5 text-gray-400">▼</span>
                      ) : (
                        <span className="inline-block w-5 h-5 text-gray-400">▶</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-2">📞</span>
                        {lead.phone_number}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{lead.owner_name || 'N/A'}</div>
                        <div className="text-gray-500">{lead.owner_email || ''}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.business_name || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.location_type || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.total_calls}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getDispositionBadge(lead.last_disposition)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.agreed_amount ? (
                        <span className="font-semibold text-green-700">
                          ${lead.agreed_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Fila expandible con historial de llamadas */}
                  {expandedLeads.has(lead.phone_number) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            Historial de llamadas ({lead.total_calls})
                          </h4>
                          
                          {loadingHistory.has(lead.phone_number) ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-sm text-gray-600">Cargando historial...</span>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {leadHistory.get(lead.phone_number)?.map((interaction, index) => (
                                <div 
                                  key={`${interaction.type}-${interaction.call_id || interaction.id}-${index}`}
                                  className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    
                                    if (onCallSelect) {
                                      if (interaction.type === 'call' && interaction.call_id) {
                                        // Abrir modal para calls normales
                                        onCallSelect({
                                          call_id: interaction.call_id,
                                          disposition: interaction.disposition,
                                          business_name: interaction.business_name,
                                          owner_name: interaction.owner_name,
                                          agreed_amount: interaction.agreed_amount
                                        } as Call)
                                      } else if (interaction.type === 'callback' && interaction.id) {
                                        // Abrir modal para callbacks usando el id como call_id
                                        onCallSelect({
                                          call_id: interaction.id, // Usar id del callback
                                          disposition: interaction.disposition || 'callback',
                                          business_name: interaction.business_name, // Ya mapeado en supabase.ts
                                          owner_name: interaction.business_name, // Para callbacks, business_name contiene el owner
                                          agreed_amount: interaction.agreed_amount,
                                          // Información adicional del callback
                                          callback_time: interaction.callback_time
                                        } as Call)
                                      }
                                    }
                                  }}
                                >
                                  {/* Información compacta en una sola línea */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Badge de tipo */}
                                      {interaction.type === 'callback' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                          🔄 Callback
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                          📞 Llamada atendida
                                        </span>
                                      )}
                                      
                                      {/* Badge de disposition */}
                                      {getDispositionBadge(interaction.disposition)}
                                      
                                      {/* Información específica por tipo */}
                                      {interaction.type === 'callback' ? (
                                        <>
                                          <span className="text-sm font-medium text-gray-900">Callback programado</span>
                                          {interaction.callback_time && (
                                            <span className="text-xs text-gray-600">
                                              📅 {new Date(interaction.callback_time).toLocaleDateString('es-ES', { 
                                                day: '2-digit', 
                                                month: '2-digit', 
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-sm font-medium text-gray-900">
                                            {interaction.business_name || 'Negocio sin nombre'}
                                          </span>
                                          {(interaction.address_street || interaction.address_city) && (
                                            <span className="text-xs text-gray-600">
                                              📍 {[
                                                interaction.address_street,
                                                interaction.address_city,
                                                interaction.address_state
                                              ].filter(Boolean).join(', ')}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    
                                    {/* Monto acordado */}
                                    {interaction.agreed_amount && (
                                      <div className="text-sm font-bold text-green-700">
                                        ${interaction.agreed_amount.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}