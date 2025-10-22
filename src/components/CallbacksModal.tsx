'use client'

import { useEffect, useState } from 'react'
import { getCallbacksByCallId, type Callback } from '@/lib/supabase'

interface CallbacksModalProps {
  isOpen: boolean
  onClose: () => void
  callId: string
}

export default function CallbacksModal({ isOpen, onClose, callId }: CallbacksModalProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && callId) {
      fetchCallbacks()
    }
  }, [isOpen, callId])

  const fetchCallbacks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCallbacksByCallId(callId)
      setCallbacks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-ES')
    } catch {
      return dateString
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-theme-surface backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-theme-border animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center p-8 border-b border-theme-border bg-theme-surface-hover">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <h2 className="text-2xl font-bold text-theme-text-primary">
                Callbacks
              </h2>
            </div>
            <p className="text-theme-text-secondary font-mono text-sm">
              Llamada ID: {callId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <span className="mt-4 text-slate-600 font-medium">Cargando callbacks...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50/80 border border-red-200/60 rounded-2xl p-8 text-center backdrop-blur-sm">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-red-800 font-medium">Error al cargar callbacks</p>
              <p className="text-red-600 text-sm mt-2">{error}</p>
            </div>
          ) : callbacks.length === 0 ? (
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-12 text-center backdrop-blur-sm">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-slate-700 font-semibold text-lg mb-2">No hay callbacks</h3>
              <p className="text-slate-600">No se encontraron callbacks registrados para esta llamada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {callbacks.map((callback, index) => (
                <div key={callback.id} className="bg-gradient-to-r from-white/60 to-slate-50/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Información General</h3>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p><span className="font-medium text-gray-900">ID:</span> {callback.id}</p>
                        <p><span className="font-medium text-gray-900">Propietario:</span> {callback.callback_owner_name}</p>
                        <p><span className="font-medium text-gray-900">Disposición:</span> {callback.disposition || 'N/A'}</p>
                        <p><span className="font-medium text-gray-900">Tipo de evento:</span> {callback.event_type || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Fechas y Tiempos</h3>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p><span className="font-medium text-gray-900">Creado:</span> {formatDate(callback.created_at)}</p>
                        <p><span className="font-medium text-gray-900">Actualizado:</span> {formatDate(callback.updated_at)}</p>
                        {callback.callback_time && (
                          <p><span className="font-medium text-gray-900">Callback programado:</span> {formatDate(callback.callback_time)}</p>
                        )}
                        {callback.call_started_at && (
                          <p><span className="font-medium text-gray-900">Llamada iniciada:</span> {formatDate(callback.call_started_at)}</p>
                        )}
                      </div>
                    </div>

                    {callback.lead_state && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Ubicación del Lead</h3>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p><span className="font-medium text-gray-900">Estado:</span> {callback.lead_state}</p>
                          {callback.lead_city && <p><span className="font-medium text-gray-900">Ciudad:</span> {callback.lead_city}</p>}
                          {callback.lead_zip && <p><span className="font-medium text-gray-900">Código postal:</span> {callback.lead_zip}</p>}
                        </div>
                      </div>
                    )}

                    {callback.callback_window_note && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Notas</h3>
                        <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-300">
                          {callback.callback_window_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-8 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white/50">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}