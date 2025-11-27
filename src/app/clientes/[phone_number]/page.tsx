
"use client"
import AnalysisModal from '@/components/AnalysisModal'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return 'N/A'
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function ClienteDetallePage() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const params = useParams()
  const phone_number = decodeURIComponent(params?.phone_number as string)
  const [cliente, setCliente] = useState<any>(null)
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedPhone, setCopiedPhone] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // Obtener datos del cliente (solo los campos relevantes)
      const { data: clienteData } = await supabase
        .from('leads')
        .select('phone_number, owner_name, business_name, location_type, email, timezone, address, created_at')
        .eq('phone_number', phone_number)
        .single()
      setCliente(clienteData)
      // Obtener timeline de llamadas y callbacks asociadas usando la función de Leads
      const { getCallHistoryByPhone } = await import('@/lib/supabase')
      const callsData = await getCallHistoryByPhone(phone_number)
      setCalls(callsData || [])
      setLoading(false)
    }
    if (phone_number) fetchData()
  }, [phone_number])

  return (
    <div className="min-h-screen bg-theme-surface">
      <Sidebar activeItem="clientes" />
      <Header sidebarCollapsed={sidebarCollapsed} currentPage="Clientes" pageTitle="Detalles del Cliente" />
      <main className={`
        pt-20 pb-8 px-6 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
      `}>
        <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-lg p-8 w-full">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-8 tracking-tight">Detalles del Cliente</h2>
          {/* <div className="mb-4 text-xs text-theme-text-secondary">Buscando por phone_number: <span className="font-mono">{phone_number}</span></div> */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-theme-text-secondary text-lg">Cargando datos...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Columna izquierda: Timeline de llamadas */}
              <div className="bg-theme-surface-hover rounded-theme-lg border border-theme-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-6 text-theme-text-primary">Timeline de Llamadas</h3>
                <div className="flex flex-col gap-6">
                  {calls.length === 0 ? (
                    <div className="text-theme-text-secondary text-base">No hay llamadas asociadas.</div>
                  ) : (
                    calls.map((call, idx) => {
                      const isLast = idx === calls.length - 1;
                      const fecha = call.created_at ? new Date(call.created_at) : null;
                      return (
                        <div key={call.call_id || call.id} className="relative flex items-start group">
                          {/* Línea del timeline */}
                          {!isLast && (
                            <div className="absolute left-6 top-12 w-0.5" style={{ backgroundColor: 'var(--color-border)', height: 'calc(100% + 2rem)' }}></div>
                          )}
                          {/* Punto del timeline */}
                          <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0"
                               style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-primary)' }}>
                            <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          {/* Contenido del timeline */}
                          <div className="ml-4 flex-1 min-w-0 cursor-pointer transition-all duration-200 group-hover:translate-x-1"
                            onClick={() => setSelectedCallId(call.call_id || call.id)}>
                            <div className="flex items-start justify-between">
                              <div className="pr-4 flex-1 min-w-0">
                                {/* Fecha y hora principales */}
                                <div className="mb-2">
                                  <time className="text-sm font-semibold" style={{ color: 'var(--color-textPrimary)' }}>
                                    {fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} • {fecha ? fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </time>
                                </div>
                                {/* Información principal */}
                                <div className="flex items-center gap-1 mb-2">
                                  {call.hasCallback && (
                                    <span title="Esta llamada tiene callback asociado" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      🔔 Callback
                                    </span>
                                  )}
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-theme-primary/20 text-theme-primary">
                                    {call.disposition || 'N/A'}
                                  </span>
                                  {typeof call.call_successful !== 'undefined' && (
                                    (() => {
                                      // Heurística: si la razón de desconexión sugiere contestador automático/voicemail,
                                      // no consideramos la llamada como realmente 'Exitosa' para evitar confusión.
                                      const isAnsweringMachine = (reason?: string | null) => {
                                        if (!reason) return false
                                        const r = reason.toLowerCase()
                                        return r.includes('contest') || r.includes('buz') || r.includes('voicemail') || r.includes('answering') || r.includes('contestador')
                                      }

                                      const consideredSuccessful = !!call.call_successful && !isAnsweringMachine(call.disconnection_reason)

                                      if (consideredSuccessful) {
                                        return (
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-theme-success/10 text-theme-success`}>
                                            Exitosa
                                          </span>
                                        )
                                      }

                                      // Si no es considerada exitosa, mostramos "Fallida: motivo" como una sola frase
                                      return (
                                        <span className="text-sm font-medium text-theme-error">
                                          {'Fallida:'}{'\u00A0'}
                                          {call.disconnection_reason ? (
                                            <span className="text-xs font-normal text-slate-800">{call.disconnection_reason}</span>
                                          ) : null}
                                        </span>
                                      )
                                    })()
                                  )}
                                </div>
                                {/* Se omiten detalles del cliente (business_name, address, owner_name)
                                    porque ya se muestran en la columna derecha. Mantener solo datos específicos de la llamada. */}
                                {/* Monto acordado */}
                                {call.agreed_amount && (
                                  <div className="mt-2">
                                    <span className="text-xs" style={{ color: 'var(--color-textMuted)' }}>
                                      Monto acordado:
                                    </span>
                                    <span className="text-sm font-bold ml-1" style={{ color: 'var(--color-success)' }}>
                                      ${call.agreed_amount.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {/* Duración (dato específico de la llamada) */}
                                <div className="text-xs text-theme-text-secondary">Duración: {formatDuration(call.duration_ms)}</div>
                              </div>
                              {/* disconnection_reason now shown inline next to the disposition/status */}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Modal de análisis de llamada */}
                <AnalysisModal
                  isOpen={!!selectedCallId}
                  onClose={() => setSelectedCallId(null)}
                  callId={selectedCallId || ''}
                />
              </div>
              {/* Columna derecha: Datos personales (vista mejorada) */}
              <div className="bg-theme-surface-hover rounded-theme-lg border border-theme-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-6 text-theme-text-primary">Datos del Cliente</h3>
                {cliente ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-semibold text-lg">
                        {cliente.business_name ? cliente.business_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-theme-text-secondary">Empresa</p>
                            <p className="text-lg font-semibold text-theme-text-primary truncate">{cliente.business_name || 'N/D'}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <div>
                            <p className="text-sm text-theme-text-secondary">Creado</p>
                            <p className="text-sm text-theme-text-primary">
                              {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/D'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-theme-text-secondary">Propietario</p>
                              <p className="text-sm text-theme-text-primary">{cliente.owner_name || 'N/D'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div>
                                <p className="text-sm text-theme-text-secondary">Teléfono</p>
                                <p className="text-theme-text-primary font-mono inline-flex items-center">
                                  {cliente.phone_number || 'N/D'}
                                </p>
                              </div>
                              {cliente.phone_number && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(cliente.phone_number)
                                      setCopiedPhone(true)
                                      setTimeout(() => setCopiedPhone(false), 1600)
                                    } catch (err) {
                                      console.error('Error copiando teléfono:', err)
                                    }
                                  }}
                                  className={`flex items-center justify-center w-5 h-5 rounded text-xs transition-all duration-150 ${copiedPhone ? 'text-theme-success bg-theme-success/20' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10'}`}
                                  title={copiedPhone ? '¡Copiado!' : 'Copiar número'}
                                >
                                  {copiedPhone ? (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-theme-text-secondary">Dirección</p>
                            <p className="text-sm text-theme-text-primary">{cliente.address || 'N/D'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-theme-primary/10 text-theme-primary">{cliente.location_type || 'N/D'}</span>
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-theme-surface-hover text-theme-text-secondary">{cliente.timezone || 'N/D'}</span>
                          </div>
                          <div>
                            <p className="text-sm text-theme-text-secondary">Email</p>
                            <p className="text-sm text-theme-text-primary">{cliente.email || 'N/D'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-theme-text-secondary text-base">No se encontró el cliente.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
