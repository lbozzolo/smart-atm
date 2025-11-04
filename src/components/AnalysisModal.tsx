'use client'

import { useEffect, useState } from 'react'
import { getCallDetailsWithPCA, type PCA, type Call } from '@/lib/supabase'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  callId: string
  // optional initial call data to display immediately (enriched from list)
  initialCallData?: any
}

export default function AnalysisModal({ isOpen, onClose, callId, initialCallData }: AnalysisModalProps) {
  const [pcaData, setPcaData] = useState<PCA[]>([])
  const [callData, setCallData] = useState<Call | null>(initialCallData ?? null)
  const [isCallback, setIsCallback] = useState(false)
  const [callbackData, setCallbackData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview')
  const [copied, setCopied] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

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
            <span className="text-theme-text-secondary">{prefix}</span>
            <span className="font-semibold text-theme-primary bg-theme-primary/10 px-1 rounded">{word}</span>
            <span className="text-theme-text-secondary">{suffix}</span>
            <span className="text-theme-text-primary">{restOfLine}</span>
          </div>
        )
      }
      
      if (userMatch) {
        // Colorear "user" en verde
        const [, prefix, word, suffix] = userMatch
        const restOfLine = line.substring(userMatch[0].length)
        return (
          <div key={lineIndex} className="mb-2">
            <span className="text-theme-text-secondary">{prefix}</span>
            <span className="font-semibold text-theme-success bg-theme-success/10 px-1 rounded">{word}</span>
            <span className="text-theme-text-secondary">{suffix}</span>
            <span className="text-theme-text-primary">{restOfLine}</span>
          </div>
        )
      }
      
      // Si no hay match, devolver la línea normal
      return (
        <div key={lineIndex} className="mb-2 text-theme-text-primary">
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

    const getSentimentColor = (sentiment: string | null | undefined) => {
    if (!sentiment) return 'bg-theme-surface-hover text-theme-text-muted'
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-theme-success/10 text-theme-success border-theme-success/20'
      case 'negative':
        return 'bg-theme-error/10 text-theme-error border-theme-error/20'
      case 'neutral':
        return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
      default:
        return 'bg-theme-surface-hover text-theme-text-secondary border-theme-border'
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

    const getDispositionColor = (disposition: string | null | undefined) => {
    if (!disposition) return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
    
    switch (disposition.toLowerCase()) {
      case 'sale':
      case 'interested':
      case 'appointment':
      case 'callback':
        return 'bg-theme-success/10 text-theme-success border-theme-success/20'
      case 'not_interested':
      case 'no_answer':
      case 'hangup':
      case 'wrong_number':
        return 'bg-theme-error/10 text-theme-error border-theme-error/20'
      case 'busy':
      case 'busy_signal':
        return 'bg-theme-accent/10 text-theme-accent border-theme-accent/20'
      case 'voicemail':
      case 'buzon':
      case 'voicemail_left':
        return 'bg-theme-primary/10 text-theme-primary border-theme-primary/20'
      default:
        return 'bg-theme-surface-hover text-theme-text-muted border-theme-border'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-theme-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-theme-border animate-in slide-in-from-bottom-2 duration-300">
        
        {/* Header compacto */}
        <div className="bg-theme-surface-hover px-4 py-3 border-b border-theme-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-theme-primary/10 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-theme-text-primary">
                  Análisis de Llamada
                </h2>
                <div className="flex items-center space-x-2">
                  <p className="text-theme-text-secondary text-xs font-mono truncate">
                    {callId}
                  </p>
                  <button
                    onClick={() => setShowRaw(v => !v)}
                    className="ml-2 text-xs px-2 py-1 border rounded text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10"
                    title="Mostrar datos crudos de la llamada"
                  >
                    {showRaw ? 'Ocultar datos' : 'Mostrar datos'}
                  </button>
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
                        ? 'text-theme-success bg-theme-success/20' 
                        : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10'
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
              className="w-8 h-8 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Pestañas compactas */}
          <div className="mt-3 flex space-x-1">
            {[
              { 
                id: 'overview', 
                label: 'Vista General', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              { 
                id: 'transcript', 
                label: 'Transcripción', 
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-theme-primary text-white'
                    : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10'
                }`}
              >
                <div className="text-xs">{tab.icon}</div>
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
                <div className="w-8 h-8 border-2 border-theme-border rounded-full animate-spin"></div>
                <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-sm text-theme-text-secondary">Cargando análisis...</p>
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
            <div className="p-6 m-4 bg-theme-surface-hover border border-theme-border rounded-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-theme-surface-hover rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-theme-text-primary mb-1">No hay análisis disponible</h3>
                <p className="text-xs text-theme-text-secondary">Esta llamada aún no ha sido procesada</p>
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
                                {pca.disconnection_reason ? (
                                  <span>
                                    <span className="text-theme-error font-semibold">Fallida:</span>
                                    <span className="ml-2 text-sm text-theme-text-secondary font-normal">{pca.disconnection_reason}</span>
                                  </span>
                                ) : (pca.call_successful ? 'Exitosa' : 'Fallida')}
                              </p>
                            </div>
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                              {(pca.disconnection_reason || !pca.call_successful) ? (
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-theme-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
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
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
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
                        <>
                          {showRaw && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded mb-2">
                              <pre className="text-xs max-h-60 overflow-auto">{JSON.stringify(callData, null, 2)}</pre>
                            </div>
                          )}
                          <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-4 mb-4">
                          <h3 className="flex items-center text-sm font-semibold text-theme-primary mb-3">
                            <span className="w-5 h-5 bg-theme-primary/10 rounded flex items-center justify-center mr-2 text-xs">
                              {isCallback ? (
                                <svg className="w-3 h-3 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </span>
                            {isCallback ? 'Información del Callback' : 'Información del Cliente'}
                          </h3>
                          
                          {isCallback && callbackData ? (
                            /* Información específica para callbacks */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Propietario</span>
                                  <span className="font-semibold text-theme-text-primary text-xs">{callbackData.callback_owner_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Teléfono propietario</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{callbackData.callback_owner_phone || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Teléfono</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{(callData as any)?.lead_phone || callbackData.callback_owner_phone || callbackData.to_number || (callData as any)?.owner_phone || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Disposition</span>
                                  <span className="font-medium text-theme-text-primary text-xs">{callbackData.disposition || 'callback'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Fecha de Callback</span>
                                  <span className="font-medium text-theme-text-primary text-xs">
                                    {callbackData.callback_time_text_raw || callbackData.callback_time || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Zona Horaria</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{callbackData.caller_tz || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Información para calls normales */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Propietario</span>
                                  <span className="font-semibold text-theme-text-primary text-xs">
                                    {callData?.owner_name && String(callData.owner_name).trim() !== ''
                                      ? callData.owner_name
                                      : ((callData as any)?.lead_business_name || callData?.business_name || 'N/A')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Negocio</span>
                                  <span className="font-semibold text-theme-text-primary text-xs">{(callData as any)?.lead_business_name || callData.business_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Tipo de Negocio</span>
                                  <span className="font-medium text-theme-text-primary text-xs">{callData.location_type || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Teléfono</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{(callData as any)?.lead_phone || callData?.owner_phone || callData?.to_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Email</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{callData.owner_email || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Dirección</span>
                                  <span className="font-medium text-theme-text-primary text-xs">
                                    {[callData.address_street, callData.address_city, callData.address_state]
                                      .filter(Boolean)
                                      .join(', ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Código Postal</span>
                                  <span className="font-mono text-theme-text-primary text-xs">{callData.address_zip || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Horarios</span>
                                  <span className="font-medium text-theme-text-primary text-xs">{callData.business_hours || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Otras Ubicaciones</span>
                                  <span className="font-medium text-theme-text-primary text-xs">{callData.other_locations || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-theme-text-secondary text-xs font-medium">Monto Acordado</span>
                                  <span className="font-bold text-theme-success text-xs">
                                    {callData.agreed_amount ? `$${callData.agreed_amount.toLocaleString()}` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>)}

                      {/* Información detallada - Solo para calls normales */}
                      {!isCallback && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h3 className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">
                                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </span>
                              Información del Agente
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-xs">Agente</span>
                                <span className="font-medium text-slate-800 text-xs">{pca.agent_name || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-theme-text-secondary text-xs">Disposición</span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getDispositionColor(pca.disposition)}`}>
                                  {pca.disposition || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h3 className="flex items-center text-sm font-semibold text-slate-800 mb-3">
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">
                                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
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
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">
                              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </span>
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
                              <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">
                                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </span>
                              Resumen
                            </h3>
                            {pca.recording_url && (
                              <a
                                href={pca.recording_url}
                                download
                                className="flex items-center space-x-1 px-2 py-1 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 rounded hover:bg-theme-primary/20 transition-colors text-xs font-medium"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
                                </svg>
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
                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center mr-2 text-xs">
                              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </span>
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
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
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