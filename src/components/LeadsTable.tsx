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
    if (!disposition) {
      return (
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: 'var(--color-surfaceHover)', color: 'var(--color-textMuted)' }}
        >
          Sin disposition
        </span>
      )
    }

    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    let styles = {}
    
    switch (disposition?.toLowerCase()) {
      // Dispositions positivos (verde)
      case 'new_lead':
      case 'interested':
      case 'successful':
      case 'success':
      case 'sale':
      case 'converted':
        styles = { backgroundColor: 'var(--color-success)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions de seguimiento (azul/primary)
      case 'callback':
      case 'follow_up':
      case 'scheduled':
      case 'reschedule':
      case 'voicemail':
        styles = { backgroundColor: 'var(--color-primaryLight)', color: 'var(--color-primaryDark)' }
        break
      
      // Dispositions de no contacto (warning)
      case 'owner_not_present':
      case 'no_answer':
      case 'busy':
      case 'unavailable':
        styles = { backgroundColor: 'var(--color-warning)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions negativos (error)
      case 'not_interested':
      case 'failed':
      case 'failure':
      case 'rejected':
      case 'wrong_number':
        styles = { backgroundColor: 'var(--color-error)', color: 'white', opacity: 0.9 }
        break
      
      // Dispositions pendientes (accent)
      case 'pending':
      case 'in_progress':
      case 'processing':
        styles = { backgroundColor: 'var(--color-accentLight)', color: 'var(--color-accentDark)' }
        break
      
      // Default (gris)
      default:
        styles = { backgroundColor: 'var(--color-surfaceHover)', color: 'var(--color-textMuted)' }
        break
    }

    return (
      <span className={baseClasses} style={styles}>
        {disposition}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-8 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="ml-4" style={{ color: 'var(--color-textSecondary)' }}>Cargando leads...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl p-8 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--color-error)' }}>{error}</p>
            <button 
              onClick={loadLeads}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
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
      <div className="rounded-xl p-6 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-textPrimary)' }}>Leads</h2>
            <p className="mt-1" style={{ color: 'var(--color-textSecondary)' }}>Gestiona los prospectos y su historial de llamadas</p>
          </div>
          <div className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            Total: {leads.length} leads
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: 'var(--color-border)' }}>
            <thead style={{ backgroundColor: 'var(--color-surfaceHover)' }}>
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Teléfono
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Cliente
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Negocio
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Tipo
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Total Llamadas
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Disposition
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-textSecondary)' }}>
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {leads.map((lead) => (
                <>
                  <tr 
                    key={lead.phone_number} 
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => toggleLeadExpansion(lead.phone_number)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                      {expandedLeads.has(lead.phone_number) ? (
                        <span className="inline-block w-5 h-5 transition-transform duration-200" style={{ color: 'var(--color-textMuted)' }}>▼</span>
                      ) : (
                        <span className="inline-block w-5 h-5 transition-transform duration-200" style={{ color: 'var(--color-textMuted)' }}>▶</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--color-textPrimary)' }}>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{lead.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                      <div>
                        <div className="font-medium">{lead.owner_name || 'N/A'}</div>
                        <div className="text-xs" style={{ color: 'var(--color-textMuted)' }}>{lead.owner_email || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      {lead.business_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      {lead.location_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--color-primaryLight)', color: 'var(--color-primaryDark)' }}>
                        {lead.total_calls}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getDispositionBadge(lead.last_disposition)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.agreed_amount ? (
                        <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                          ${lead.agreed_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-textMuted)' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Fila expandible con historial de llamadas */}
                  {expandedLeads.has(lead.phone_number) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6" style={{ backgroundColor: 'var(--color-surfaceHover)' }}>
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold flex items-center" style={{ color: 'var(--color-textPrimary)' }}>
                            <svg className="w-3 h-3 mr-2" style={{ color: 'var(--color-primary)' }} fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="10" />
                            </svg>
                            Historial de llamadas ({lead.total_calls})
                          </h4>
                          
                          {loadingHistory.has(lead.phone_number) ? (
                            <div className="flex items-center justify-center py-6">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                              <span className="ml-3 text-sm" style={{ color: 'var(--color-textSecondary)' }}>Cargando historial...</span>
                            </div>
                          ) : (
                            <div className="relative">
                              {/* Timeline */}
                              <div className="space-y-8">
                                {leadHistory.get(lead.phone_number)?.map((interaction, index) => {
                                  const isLast = index === (leadHistory.get(lead.phone_number)?.length || 0) - 1
                                  
                                  // Función para obtener fecha formateada
                                  const getInteractionDate = () => {
                                    if (interaction.type === 'callback' && interaction.callback_time) {
                                      return new Date(interaction.callback_time)
                                    } else if (interaction.created_at) {
                                      return new Date(interaction.created_at)
                                    }
                                    return new Date()
                                  }

                                  const interactionDate = getInteractionDate()
                                  
                                  return (
                                    <div 
                                      key={`${interaction.type}-${interaction.call_id || interaction.id}-${index}`}
                                      className="relative flex items-start group"
                                    >
                                      {/* Timeline Line */}
                                      {!isLast && (
                                        <div 
                                          className="absolute left-6 top-12 w-0.5"
                                          style={{ 
                                            backgroundColor: 'var(--color-border)',
                                            height: 'calc(100% + 2rem)'
                                          }}
                                        ></div>
                                      )}
                                      
                                      {/* Timeline Dot */}
                                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0"
                                           style={{ 
                                             backgroundColor: 'var(--color-surface)',
                                             borderColor: interaction.type === 'callback' ? 'var(--color-accent)' : 'var(--color-primary)'
                                           }}>
                                        {interaction.type === 'callback' ? (
                                          <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                        )}
                                      </div>
                                      
                                      {/* Timeline Content */}
                                      <div className="ml-4 flex-1 min-w-0">
                                        <div 
                                          className="cursor-pointer transition-all duration-200 group-hover:translate-x-1"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            
                                            if (onCallSelect) {
                                              if (interaction.type === 'call' && interaction.call_id) {
                                                onCallSelect({
                                                  call_id: interaction.call_id,
                                                  disposition: interaction.disposition,
                                                  business_name: interaction.business_name,
                                                  owner_name: interaction.owner_name,
                                                  agreed_amount: interaction.agreed_amount
                                                } as Call)
                                              } else if (interaction.type === 'callback' && interaction.id) {
                                                onCallSelect({
                                                  call_id: interaction.id,
                                                  disposition: interaction.disposition || 'callback',
                                                  business_name: interaction.business_name,
                                                  owner_name: interaction.business_name,
                                                  agreed_amount: interaction.agreed_amount,
                                                  callback_time: interaction.callback_time
                                                } as Call)
                                              }
                                            }
                                          }}
                                        >
                                          {/* Fecha y hora principales */}
                                          <div className="mb-2">
                                            <time className="text-sm font-semibold" style={{ color: 'var(--color-textPrimary)' }}>
                                              {interactionDate.toLocaleDateString('es-ES', { 
                                                day: '2-digit', 
                                                month: 'short',
                                                year: 'numeric'
                                              })} • {interactionDate.toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </time>
                                          </div>
                                          
                                          {/* Información principal */}
                                          <div className="flex items-center gap-2 mb-2">
                                            <span 
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                              style={{ 
                                                backgroundColor: interaction.type === 'callback' ? 'var(--color-accentLight)' : 'var(--color-primaryLight)', 
                                                color: interaction.type === 'callback' ? 'var(--color-accentDark)' : 'var(--color-primaryDark)'
                                              }}
                                            >
                                              {interaction.type === 'callback' ? 'Callback' : 'Llamada'}
                                            </span>
                                            
                                            {getDispositionBadge(interaction.disposition)}
                                          </div>
                                          
                                          {/* Detalles específicos */}
                                          {interaction.type === 'callback' ? (
                                            <div className="space-y-1">
                                              <p className="font-medium text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                                                Callback programado
                                              </p>
                                              {interaction.callback_time && (
                                                <p className="text-xs flex items-center" style={{ color: 'var(--color-textMuted)' }}>
                                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                  Para: {new Date(interaction.callback_time).toLocaleDateString('es-ES', { 
                                                    day: '2-digit', 
                                                    month: '2-digit', 
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })}
                                                </p>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <p className="font-medium text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                                                {interaction.business_name || 'Negocio sin nombre'}
                                              </p>
                                              {(interaction.address_street || interaction.address_city) && (
                                                <p className="text-xs flex items-center" style={{ color: 'var(--color-textMuted)' }}>
                                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                  </svg>
                                                  {[
                                                    interaction.address_street,
                                                    interaction.address_city,
                                                    interaction.address_state
                                                  ].filter(Boolean).join(', ')}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Monto acordado */}
                                          {interaction.agreed_amount && (
                                            <div className="mt-2">
                                              <span className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                                                Monto acordado: 
                                              </span>
                                              <span className="text-sm font-bold ml-1" style={{ color: 'var(--color-success)' }}>
                                                ${interaction.agreed_amount.toLocaleString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
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