'use client'

import { useEffect, useState } from 'react'
import { getCallDetailsWithPCA, type PCA, type Call } from '@/lib/supabase'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  callId: string
}

export default function AnalysisModal({ isOpen, onClose, callId }: AnalysisModalProps) {
  const [pcaData, setPcaData] = useState<PCA[]>([])
  const [callData, setCallData] = useState<Call | null>(null)
  const [isCallback, setIsCallback] = useState(false)
  const [callbackData, setCallbackData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && callId) {
      fetchPCAData()
    }
  }, [isOpen, callId])

  const fetchPCAData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Fetching data for callId:', callId)
      const { call, pca, isCallback: isCallbackResult, callback } = await getCallDetailsWithPCA(callId)
      console.log('📊 Result:', { call, pca, isCallbackResult, callback })
      setCallData(call)
      setPcaData(pca)
      setIsCallback(isCallbackResult)
      setCallbackData(callback)
      console.log('✅ State updated - isCallback:', isCallbackResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Función para colorear las palabras "agent" y "user" en la transcripción
  const formatTranscript = (transcript: string) => {
    if (!transcript) return null

    // Dividir el texto en líneas y procesar cada una
    const lines = transcript.split('\n')
    
    return lines.map((line, lineIndex) => {
      // Buscar patrones como "agent:" o "user:" al inicio de línea (case insensitive)
      const agentMatch = line.match(/^(\s*)(agent)(\s*:)/i)
      const userMatch = line.match(/^(\s*)(user)(\s*:)/i)
      
      if (agentMatch) {
        // Colorear "agent" en azul
        const [, prefix, word, suffix] = agentMatch
        const restOfLine = line.substring(agentMatch[0].length)
        return (
          <div key={lineIndex} className="mb-2">
            <span className="text-slate-600">{prefix}</span>
            <span className="font-semibold text-blue-600 bg-blue-50 px-1 rounded">{word}</span>
            <span className="text-slate-600">{suffix}</span>
            <span className="text-slate-700">{restOfLine}</span>
          </div>
        )
      }
      
      if (userMatch) {
        // Colorear "user" en verde
        const [, prefix, word, suffix] = userMatch
        const restOfLine = line.substring(userMatch[0].length)
        return (
          <div key={lineIndex} className="mb-2">
            <span className="text-slate-600">{prefix}</span>
            <span className="font-semibold text-green-600 bg-green-50 px-1 rounded">{word}</span>
            <span className="text-slate-600">{suffix}</span>
            <span className="text-slate-700">{restOfLine}</span>
          </div>
        )
      }
      
      // Si no hay match, devolver la línea normal
      return (
        <div key={lineIndex} className="mb-2 text-slate-700">
          {line}
        </div>
      )
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return 'N/A'
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'bg-slate-100 text-slate-600'
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'positivo':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'negative':
      case 'negativo':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'neutral':
        return 'bg-stone-100 text-stone-700 border-stone-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return '🤔'
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'positivo':
        return '😊'
      case 'negative':
      case 'negativo':
        return '😞'
      case 'neutral':
        return '😐'
      default:
        return '🤔'
    }
  }

  const getDispositionBadge = (disposition?: string) => {
    if (!disposition) return 'bg-gray-100 text-gray-600 border-gray-200'
    
    switch (disposition.toLowerCase()) {
      case 'successful':
      case 'success':
      case 'exitosa':
      case 'completada':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'failed':
      case 'failure':
      case 'fallida':
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pending':
      case 'pendiente':
      case 'en_proceso':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'cancelled':
      case 'cancelada':
      case 'canceled':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'no_answer':
      case 'sin_respuesta':
      case 'no_response':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'busy':
      case 'ocupado':
      case 'busy_signal':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'voicemail':
      case 'buzon':
      case 'voicemail_left':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-2 duration-300">
        
        {/* Header compacto */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                <span className="text-sm">📊</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white">
                  Análisis de Llamada
                </h2>
                <div className="flex items-center space-x-2">
                  <p className="text-slate-400 text-xs font-mono truncate">
                    {callId}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(callId)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      } catch (err) {
                        console.error('Error al copiar:', err)
                      }
                    }}
                    className={`flex items-center justify-center w-5 h-5 rounded text-xs transition-all duration-150 ${
                      copied 
                        ? 'text-green-400 bg-green-400/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={copied ? "¡Copiado!" : "Copiar ID de llamada"}
                  >
                    {copied ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Pestañas compactas */}
          <div className="mt-3 flex space-x-1">
            {[
              { id: 'overview', label: 'Vista General', icon: '🎯' },
              { id: 'transcript', label: 'Transcripción', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="relative mb-4">
                <div className="w-8 h-8 border-2 border-slate-200 rounded-full animate-spin"></div>
                <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-sm text-slate-600">Cargando análisis...</p>
            </div>
          ) : error ? (
            <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg">⚠️</span>
                </div>
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error al cargar análisis</h3>
                <p className="text-xs text-red-600 mb-3">{error}</p>
                <button
                  onClick={fetchPCAData}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : pcaData.length === 0 ? (
            <div className="p-6 m-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📊</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">No hay análisis disponible</h3>
                <p className="text-xs text-slate-600">Esta llamada aún no ha sido procesada</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {pcaData.map((pca, index) => (
                <div key={pca.id} className="space-y-4">
                  
                  {/* Vista General */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      
                      {/* Métricas principales */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-slate-600 text-xs font-medium">Estado</p>
                              <p className="text-lg font-semibold text-slate-800">
                                {pca.call_successful ? 'Exitosa' : 'Fallida'}
                              </p>
                            </div>
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                              <span className="text-lg">{pca.call_successful ? '✅' : '❌'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-600 text-xs font-medium">Duración</p>
                              <p className="text-lg font-semibold text-gray-800">{formatDuration(pca.duration_ms)}</p>
                            </div>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-lg">⏱️</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-stone-600 text-xs font-medium">Sentimiento</p>
                              <p className="text-lg font-semibold text-stone-800">{pca.user_sentiment || 'N/A'}</p>
                            </div>
                            <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center">
                              <span className="text-lg">{getSentimentIcon(pca.user_sentiment)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Información del Cliente */}
                      {callData && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <h3 className="flex items-center text-sm font-semibold text-blue-800 mb-3">
                            <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center mr-2 text-xs">
                              {isCallback ? '🔄' : '👨‍💼'}
                            </span>
                            {isCallback ? 'Información del Callback' : 'Información del Cliente'}
                          </h3>
                          
                          {isCallback && callbackData ? (
                            /* Información específica para callbacks */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Propietario</span>
                                  <span className="font-semibold text-blue-900 text-xs">{callbackData.callback_owner_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Teléfono</span>
                                  <span className="font-mono text-blue-900 text-xs">{callbackData.to_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Disposition</span>
                                  <span className="font-medium text-blue-900 text-xs">{callbackData.disposition || 'callback'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Fecha de Callback</span>
                                  <span className="font-medium text-blue-900 text-xs">
                                    {callbackData.callback_time_text_raw || callbackData.callback_time || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Estado</span>
                                  <span className="font-medium text-blue-900 text-xs">{callbackData.lead_state || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Zona Horaria</span>
                                  <span className="font-medium text-blue-900 text-xs">{callbackData.caller_tz || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Información para calls normales */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Propietario</span>
                                  <span className="font-semibold text-blue-900 text-xs">{callData.owner_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Negocio</span>
                                  <span className="font-semibold text-blue-900 text-xs">{callData.business_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Tipo de Negocio</span>
                                  <span className="font-medium text-blue-900 text-xs">{callData.location_type || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Teléfono</span>
                                  <span className="font-mono text-blue-900 text-xs">{callData.owner_phone || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Email</span>
                                  <span className="font-mono text-blue-900 text-xs">{callData.owner_email || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Dirección</span>
                                  <span className="font-medium text-blue-900 text-xs">
                                    {[callData.address_street, callData.address_city, callData.address_state]
                                      .filter(Boolean)
                                      .join(', ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Código Postal</span>
                                  <span className="font-mono text-blue-900 text-xs">{callData.address_zip || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Horarios</span>
                                  <span className="font-medium text-blue-900 text-xs">{callData.business_hours || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Otras Ubicaciones</span>
                                  <span className="font-medium text-blue-900 text-xs">{callData.other_locations || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-blue-700 text-xs font-medium">Monto Acordado</span>
                                  <span className="font-bold text-green-700 text-xs">
                                    {callData.agreed_amount ? `$${callData.agreed_amount.toLocaleString()}` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Información detallada - Solo para calls normales */}
                      {!isCallback && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h3 className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">👤</span>
                              Información del Agente
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-xs">Agente</span>
                                <span className="font-medium text-slate-800 text-xs">{pca.agent_name || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-xs">Disposición</span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getDispositionBadge(pca.disposition)}`}>
                                  {pca.disposition || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h3 className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">🕐</span>
                              Marcas de Tiempo
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-xs">Inicio</span>
                                <span className="font-medium text-slate-800 text-xs">{pca.start_timestamp ? formatDate(pca.start_timestamp) : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-xs">Fin</span>
                                <span className="font-medium text-slate-800 text-xs">{pca.end_timestamp ? formatDate(pca.end_timestamp) : 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fecha de la llamada - Solo para callbacks */}
                      {isCallback && callbackData && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">📅</span>
                            Fecha de la Llamada Original
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-600 text-xs">Llamada realizada</span>
                              <span className="font-medium text-slate-800 text-xs">
                                {callbackData.call_started_at ? formatDate(callbackData.call_started_at) : 
                                 callbackData.created_at ? formatDate(callbackData.created_at) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Resumen de llamada */}
                      {pca.call_summary && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="flex items-center text-sm font-semibold text-slate-800">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">📋</span>
                              Resumen
                            </h3>
                            {pca.recording_url && (
                              <a
                                href={pca.recording_url}
                                download
                                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
                              >
                                <span>🎵</span>
                                <span>Audio</span>
                              </a>
                            )}
                          </div>
                          <div className="bg-white rounded p-3 border border-slate-200">
                            <p className="text-slate-700 text-sm leading-relaxed">{pca.call_summary}</p>
                          </div>
                        </div>
                      )}


                    </div>
                  )}

                  {/* Pestaña de Transcripción */}
                  {activeTab === 'transcript' && (
                    <div className="bg-white rounded-lg border border-slate-200">
                      {pca.transcript ? (
                        <div className="p-4">
                          <div className="flex items-center mb-3">
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">📝</span>
                            <h3 className="text-sm font-semibold text-slate-800">Transcripción</h3>
                          </div>
                          <div className="bg-slate-50 rounded p-3 border border-slate-200">
                            <div className="leading-relaxed text-sm">
                              {formatTranscript(pca.transcript)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-lg">📝</span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-700 mb-1">Sin transcripción</h3>
                          <p className="text-xs text-slate-500">No hay transcripción disponible</p>
                        </div>
                      )}
                    </div>
                  )}


                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer compacto */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 transition-colors"
            >
              <span>Cerrar</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}