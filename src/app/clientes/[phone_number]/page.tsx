
"use client"
import AnalysisModal from '@/components/AnalysisModal'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function ClienteDetallePage() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const params = useParams()
  const phone_number = decodeURIComponent(params?.phone_number as string)
  const [cliente, setCliente] = useState<any>(null)
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // Obtener datos del cliente (solo los campos relevantes)
      const { data: clienteData } = await supabase
        .from('leads')
        .select('phone_number, owner_name, business_name, location_type, email, timezone, address')
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
      <main className="ml-64 p-8">
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
                            {/* Fecha y hora principales */}
                            <div className="mb-2">
                              <time className="text-sm font-semibold" style={{ color: 'var(--color-textPrimary)' }}>
                                {fecha ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} • {fecha ? fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </time>
                            </div>
                            {/* Información principal */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-theme-primary/10 text-theme-primary">
                                Llamada
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-theme-primary/20 text-theme-primary">
                                {call.disposition || 'N/A'}
                              </span>
                              {typeof call.call_successful !== 'undefined' && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${call.call_successful ? 'bg-theme-success/10 text-theme-success' : 'bg-theme-error/10 text-theme-error'}`}>
                                  {call.call_successful ? 'Exitosa' : 'Fallida'}
                                </span>
                              )}
                            </div>
                            {/* Detalles específicos */}
                            <div className="space-y-1">
                              <p className="font-medium text-sm" style={{ color: 'var(--color-textPrimary)' }}>
                                {call.business_name || 'Negocio sin nombre'}
                              </p>
                              {call.address && (
                                <p className="text-xs flex items-center" style={{ color: 'var(--color-textMuted)' }}>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {call.address}
                                </p>
                              )}
                            </div>
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
                            {/* Propietario y duración */}
                            <div className="text-xs text-theme-text-secondary mt-1">{call.owner_name || 'N/A'}</div>
                            <div className="text-xs text-theme-text-secondary">Duración: {call.duration_ms ? `${Math.round(call.duration_ms/1000)}s` : 'N/A'}</div>
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
              {/* Columna derecha: Datos personales */}
              <div className="bg-theme-surface-hover rounded-theme-lg border border-theme-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-6 text-theme-text-primary">Datos del Cliente</h3>
                {cliente ? (
                  <div className="space-y-4">
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Empresa:</span> <span className="text-theme-text-primary font-semibold">{cliente.business_name || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Propietario:</span> <span className="text-theme-text-primary">{cliente.owner_name || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Teléfono:</span> <span className="font-mono text-theme-text-primary">{cliente.phone_number || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Dirección:</span> <span className="text-theme-text-primary">{cliente.address || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Tipo de Ubicación:</span> <span className="text-theme-text-primary">{cliente.location_type || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Email:</span> <span className="text-theme-text-primary">{cliente.email || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="font-medium text-theme-text-secondary w-40">Zona Horaria:</span> <span className="text-theme-text-primary">{cliente.timezone || 'N/A'}</span></div>
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
