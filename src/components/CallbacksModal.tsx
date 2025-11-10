 'use client'

import { useEffect, useState } from 'react'
import { getCallbacksByCallId, getCallDetailsWithPCA, updateCallbackById, createCallback, getLatestPcaByCallId, updatePcaById, getLatestPcaTranscriptByCallId, getCallBasic, type Callback, type PCA } from '@/lib/supabase'

interface CallbacksModalProps {
  isOpen: boolean
  // onClose may receive a boolean indicating whether the parent should reload data
  onClose: (shouldReload?: boolean) => void
  callId: string
  source?: 'possibly_interested'
}

export default function CallbacksModal({ isOpen, onClose, callId, source }: CallbacksModalProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pcaData, setPcaData] = useState<PCA[]>([])
  const [callData, setCallData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview')
  // Edición/confirmación humana por callback
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCallbackChoice, setIsCallbackChoice] = useState<boolean | null>(null)
  const [formOwnerName, setFormOwnerName] = useState('')
  const [formOwnerPhone, setFormOwnerPhone] = useState('')
  const [formTimeText, setFormTimeText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Indica si durante la sesión del modal se hicieron cambios que requieren recargar la lista
  const [dataChanged, setDataChanged] = useState(false)

  // Para flujo de possibly_interested (modal simplificada)
  const [piChoice, setPiChoice] = useState<boolean | null>(null)
  const [piSaving, setPiSaving] = useState(false)
  const [piError, setPiError] = useState<string | null>(null)
  const [piShowNoPicker, setPiShowNoPicker] = useState(false)
  const [piNoDisposition, setPiNoDisposition] = useState('not_interested')

  const [noPickerForId, setNoPickerForId] = useState<string | null>(null)
  const [noPickerValue, setNoPickerValue] = useState('not_interested')
  const [noPickerSaving, setNoPickerSaving] = useState(false)
  const [noPickerError, setNoPickerError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && callId) {
      fetchAll()
    }
  }, [isOpen, callId])

  useEffect(() => {
    // Si abrimos desde possibly_interested, prellenar formulario con datos de la llamada
    if (isOpen && source === 'possibly_interested' && callData) {
      setFormOwnerName(callData.owner_name || callData.agent_name || '')
      setFormOwnerPhone(callData.to_number || callData.owner_phone || '')
      setFormTimeText('')
      setPiChoice(null)
    }
  }, [isOpen, source, callData])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)

      if (source === 'possibly_interested') {
        // flujo optimizado: sólo necesitamos transcript/recording y algunos campos básicos de call
        const [pcaRow, basicCall] = await Promise.all([
          getLatestPcaTranscriptByCallId(callId),
          getCallBasic(callId)
        ])

        setCallbacks([])
        setCallData(basicCall || null)
        setPcaData(pcaRow ? [pcaRow as PCA] : [])
      } else {
        // Pedir callbacks y detalles/PCA en paralelo (flujo completo para edición)
        const [callbacksRes, detailsRes] = await Promise.all([
          getCallbacksByCallId(callId),
          getCallDetailsWithPCA(callId)
        ])

        setCallbacks(Array.isArray(callbacksRes) ? callbacksRes : [])

        // detailsRes puede contener { call, pca, isCallback, callback }
        if (detailsRes && typeof detailsRes === 'object') {
          setCallData(detailsRes.call ?? null)
          setPcaData(Array.isArray(detailsRes.pca) ? detailsRes.pca : [])
        } else {
          setCallData(null)
          setPcaData([])
        }
      }
    } catch (err) {
      console.error('Error fetching callbacks/details in modal:', err)
      const message = err instanceof Error ? err.message : (err && (err as any).message) ? (err as any).message : (typeof err === 'string' ? err : JSON.stringify(err))
      setError(message || 'Error desconocido')
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

  const formatTranscript = (transcript: string) => {
    if (!transcript) return null
    const lines = transcript.split('\n')
    return lines.map((line, lineIndex) => {
      const agentMatch = line.match(/^(\s*)(agent)(\s*:)/i)
      const userMatch = line.match(/^(\s*)(user)(\s*:)/i)

      if (agentMatch) {
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

      return (
        <div key={lineIndex} className="mb-2 text-theme-text-primary">
          {line}
        </div>
      )
    })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <span className="mt-4 text-slate-600 font-medium">Cargando...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-red-50/80 border border-red-200/60 rounded-2xl p-8 text-center backdrop-blur-sm">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      )
    }

    if (source === 'possibly_interested') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
              <div>
              <h3 className="text-lg font-semibold text-slate-800">Revisión de callback — Posiblemente interesado</h3>
              <p className="text-sm text-slate-600">Revisa la transcripción y marca si corresponde a un callback.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPiChoice(true); setPiError(null); setFormOwnerName(callData?.owner_name || callData?.agent_name || ''); setFormOwnerPhone(callData?.callback_owner_phone || callData?.to_number || callData?.owner_phone || ''); }}
                className="px-3 py-1 bg-theme-success/10 text-theme-success rounded text-sm font-medium"
              >
                Sí
              </button>

              <div>
                {!piShowNoPicker ? (
                  <button
                    onClick={() => { setPiShowNoPicker(true); setPiNoDisposition('not_interested'); setPiError(null) }}
                    className="px-3 py-1 bg-theme-error/10 text-theme-error rounded text-sm font-medium"
                  >
                    No
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select value={piNoDisposition} onChange={(e) => setPiNoDisposition(e.target.value)} className="px-2 py-1 border rounded text-sm">
                      <option value="invalid_number">invalid_number</option>
                      <option value="no_answer">no_answer</option>
                      <option value="owner_not_present">owner_not_present</option>
                      <option value="not_interested">not_interested</option>
                      <option value="possibly_interested">possibly_interested</option>
                    </select>
                    <button
                      onClick={async () => {
                        try {
                          setPiSaving(true)
                          setPiError(null)
                          // Actualizar disposition en PCA (no crear callback)
                          const latest = await getLatestPcaByCallId(callId)
                          if (!latest) {
                            setPiError('No se encontró registro PCA para actualizar')
                            return
                          }
                          await updatePcaById(latest.id, { disposition: piNoDisposition })
                          await fetchAll()
                          setPiShowNoPicker(false)
                          // indicar que hubo cambio y cerrar modal para remover la llamada de la vista "Posiblemente interesados"
                          setDataChanged(true)
                          onClose(true)
                        } catch (err) {
                          console.error('Error actualizando PCA disposition (PI):', err)
                          setPiError('Error actualizando')
                        } finally {
                          setPiSaving(false)
                        }
                      }}
                      className="px-2 py-1 bg-theme-primary text-white rounded text-sm"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setPiShowNoPicker(false)} className="px-2 py-1 border rounded text-sm">Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transcript + audio */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            {pcaData && pcaData.length > 0 && pcaData[0].transcript ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">Transcripción</h3>
                    {pcaData[0].recording_url && (
                      <a href={pcaData[0].recording_url} download className="ml-4 text-sm text-theme-primary hover:underline">Descargar audio</a>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded p-3 border border-slate-200">
                  <div className="leading-relaxed text-sm">
                    {formatTranscript(pcaData[0].transcript)}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Sin transcripción</h3>
                <p className="text-xs text-slate-500">No hay transcripción disponible para esta llamada</p>
              </div>
            )}
          </div>

          {/* Si el humano eligió Sí, mostrar formulario */}
          {piChoice && (
            <div className="bg-white p-4 rounded border border-slate-200 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-theme-text-muted">Propietario del callback</label>
                  <input value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted">Teléfono propietario</label>
                  <input value={formOwnerPhone} onChange={(e) => setFormOwnerPhone(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted">Callback time (texto)</label>
                  <input value={formTimeText} onChange={(e) => setFormTimeText(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
              </div>

              {piError && <div className="text-sm text-red-600">{piError}</div>}

              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={() => { setPiChoice(null); setPiError(null) }} className="px-3 py-1 border rounded text-sm">Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      setPiSaving(true)
                      setPiError(null)
                      // Asegurar que el call_id del callback venga del PCA más reciente
                      let callbackCallId = callId
                      try {
                        const latestPca = await getLatestPcaByCallId(callId)
                        if (latestPca && latestPca.call_id) callbackCallId = latestPca.call_id
                      } catch (e) {
                        // si falla, seguimos con el callId que ya tenemos
                        console.warn('No se pudo obtener PCA para asignar call_id al callback:', e)
                      }

                      await createCallback({
                        call_id: callbackCallId,
                        callback_owner_name: formOwnerName || undefined,
                        callback_owner_phone: formOwnerPhone || undefined,
                        callback_time_text_raw: formTimeText || undefined,
                        to_number: callData?.to_number || undefined,
                        disposition: 'callback'
                      })
                      await fetchAll()
                      // indicar que hubo un cambio (se creó un callback)
                      setDataChanged(true)
                      setPiChoice(null)
                    } catch (err) {
                      console.error('Error creando callback (PI):', err)
                      setPiError('Error guardando los datos')
                    } finally {
                      setPiSaving(false)
                    }
                  }}
                  disabled={piSaving}
                  className="px-3 py-1 bg-theme-primary text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {piSaving ? 'Guardando...' : 'Guardar callback'}
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // overview tab content
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          {/* Si tenemos información PCA/recording, mostrar botón de audio */}
          {pcaData && pcaData[0] && (pcaData[0].recording_url || pcaData[0].recording_multi_channel_url) && (
            <div className="flex justify-end">
              <a
                href={pcaData[0].recording_url || pcaData[0].recording_multi_channel_url}
                download
                className="inline-flex items-center space-x-2 px-3 py-1 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 rounded text-sm font-medium hover:bg-theme-primary/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4L8 11" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21H3" />
                </svg>
                <span>Descargar audio</span>
              </a>
            </div>
          )}

          {callbacks.length === 0 ? (
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-12 text-center">
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
                        <p><span className="font-medium text-gray-900">Teléfono propietario:</span> {callback.callback_owner_phone || callback.to_number || 'N/A'}</p>
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

                    {/* Sección: ¿Es callback? */}
                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-gray-800 mb-2">¿Es callback?</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => {
                            setEditingId(callback.id)
                            setIsCallbackChoice(true)
                            setFormOwnerName(callback.callback_owner_name || '')
                            setFormOwnerPhone(callback.callback_owner_phone || callback.to_number || '')
                            setFormTimeText(callback.callback_time_text_raw || callback.callback_time || '')
                            setSaveError(null)
                          }}
                          className="px-3 py-1 bg-theme-success/10 text-theme-success rounded text-sm font-medium"
                        >
                          Sí
                        </button>
                        {!noPickerForId ? (
                          <button
                            onClick={() => { setNoPickerForId(callback.id); setNoPickerValue('not_interested'); setNoPickerError(null) }}
                            className="px-3 py-1 bg-theme-error/10 text-theme-error rounded text-sm font-medium"
                          >
                            No
                          </button>
                        ) : noPickerForId === callback.id ? (
                          <div className="flex items-center gap-2">
                            <select value={noPickerValue} onChange={(e) => setNoPickerValue(e.target.value)} className="px-2 py-1 border rounded text-sm">
                              <option value="invalid_number">invalid_number</option>
                              <option value="no_answer">no_answer</option>
                              <option value="owner_not_present">owner_not_present</option>
                              <option value="not_interested">not_interested</option>
                              <option value="possibly_interested">possibly_interested</option>
                            </select>
                            <button
                              onClick={async () => {
                                try {
                                  setNoPickerSaving(true)
                                  setNoPickerError(null)
                                  await updateCallbackById(callback.id, { disposition: noPickerValue })
                                    await fetchAll()
                                    // indicar que hubo un cambio (se actualizó disposition del callback)
                                    setDataChanged(true)
                                    setNoPickerForId(null)
                                } catch (err) {
                                  console.error('Error marcando disposition:', err)
                                  setNoPickerError('Error actualizando el registro')
                                } finally {
                                  setNoPickerSaving(false)
                                }
                              }}
                              className="px-2 py-1 bg-theme-primary text-white rounded text-sm"
                            >
                              Guardar
                            </button>
                            <button onClick={() => setNoPickerForId(null)} className="px-2 py-1 border rounded text-sm">Cancelar</button>
                          </div>
                        ) : null}
                      </div>

                      {editingId === callback.id && isCallbackChoice && (
                        <div className="bg-white p-4 rounded border border-slate-200 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-theme-text-muted">Propietario del callback</label>
                              <input value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-theme-text-muted">Teléfono propietario</label>
                              <input value={formOwnerPhone} onChange={(e) => setFormOwnerPhone(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-theme-text-muted">Callback time (texto)</label>
                              <input value={formTimeText} onChange={(e) => setFormTimeText(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                            </div>
                          </div>

                          {saveError && <div className="text-sm text-red-600">{saveError}</div>}

                          <div className="flex items-center justify-end gap-2 mt-3">
                            <button onClick={() => { setEditingId(null); setIsCallbackChoice(null); setSaveError(null) }} className="px-3 py-1 border rounded text-sm">Cancelar</button>
                            <button
                              onClick={async () => {
                                try {
                                  setSaving(true)
                                  setSaveError(null)
                                  // Normalizar teléfono a dígitos
                                  const normalizedPhone = String(formOwnerPhone || '').replace(/\D/g, '')
                                  await updateCallbackById(callback.id, {
                                    callback_owner_name: formOwnerName || undefined,
                                    callback_owner_phone: normalizedPhone || undefined,
                                    callback_time_text_raw: formTimeText || undefined,
                                    // no modificamos to_number (preservar si existe)
                                    disposition: 'callback'
                                  })
                                  // refrescar datos
                                  await fetchAll()
                                  // indicar que hubo un cambio (edición de callback)
                                  setDataChanged(true)
                                  setEditingId(null)
                                  setIsCallbackChoice(null)
                                } catch (err) {
                                  console.error('Error guardando callback:', err)
                                  setSaveError('Error guardando los cambios')
                                } finally {
                                  setSaving(false)
                                }
                              }}
                              disabled={saving}
                              className="px-3 py-1 bg-theme-primary text-white rounded text-sm font-medium disabled:opacity-50"
                            >
                              {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // transcript tab
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        {pcaData && pcaData.length > 0 && pcaData[0].transcript ? (
          <div>
            <div className="flex items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Transcripción</h3>
              {pcaData[0].recording_url && (
                <a href={pcaData[0].recording_url} download className="ml-4 text-sm text-theme-primary hover:underline">Descargar audio</a>
              )}
            </div>
            <div className="bg-slate-50 rounded p-3 border border-slate-200">
              <div className="leading-relaxed text-sm">
                {formatTranscript(pcaData[0].transcript)}
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
            <p className="text-xs text-slate-500">No hay transcripción disponible para esta llamada</p>
          </div>
        )}
      </div>
    )
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
            onClick={() => onClose(dataChanged)}
            className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pestañas compactas (omitimos cuando venimos de possibly_interested: dejamos transcript arriba) */}
        {source === 'possibly_interested' ? (
          <div className="px-8 pb-4">
            {/* Pregunta y controles estarán renderizados más abajo en el body para este modo */}
          </div>
        ) : (
          <div className="px-8 pb-4">
            <div className="mt-3 flex space-x-1">
              {[
                { id: 'overview', label: 'Vista General' },
                { id: 'transcript', label: 'Transcripción' }
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
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {renderContent()}
        </div>

        <div className="flex justify-end p-8 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white/50">
          <button
            onClick={() => onClose(dataChanged)}
            className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}