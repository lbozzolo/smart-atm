"use client"

import { useEffect, useState } from 'react'
import {
  getCallbacksByCallId,
  getCallDetailsWithPCA,
  updateCallbackById,
  createCallback,
  getLatestPcaByCallId,
  updatePcaById,
  getLatestPcaTranscriptByCallId,
  getCallBasicWithLead,
  type Callback,
  type PCA
} from '@/lib/supabase'

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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Indica si durante la sesión del modal se hicieron cambios que requieren recargar la lista
  const [dataChanged, setDataChanged] = useState(false)

  // pestañas
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript'>('overview')

  // edición de callback
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCallbackChoice, setIsCallbackChoice] = useState<boolean | null>(null)
  const [formOwnerName, setFormOwnerName] = useState('')
  const [formOwnerPhone, setFormOwnerPhone] = useState('')
  const [formTimeText, setFormTimeText] = useState('')

  // possibly_interested flow states
  const [piChoice, setPiChoice] = useState<boolean | null>(null)
  const [piSaving, setPiSaving] = useState(false)
  const [piError, setPiError] = useState<string | null>(null)

  // valor temporal usado en el flujo possibly_interested para marcar como not_interested u otras
  const [noPickerValue, setNoPickerValue] = useState('not_interested')

  useEffect(() => {
    if (isOpen && callId) fetchAll()
  }, [isOpen, callId])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)

      // si venimos desde possibly_interested, usamos consultas ligeras
      if (source === 'possibly_interested') {
        const latestPca = await getLatestPcaTranscriptByCallId(callId)
        const callBasic = await getCallBasicWithLead(callId)
        setPcaData(latestPca ? [latestPca] as any : [])
        setCallData(callBasic ?? null)
        // también comprobar si existen callbacks
        const cbs = await getCallbacksByCallId(callId)
        setCallbacks(cbs ?? [])
      } else {
        // vista normal: traer detalles completos
        const { call, pca, callback } = await getCallDetailsWithPCA(callId)
        setCallData(call ?? null)
        setPcaData(pca ?? [])
        setCallbacks(callback ? (Array.isArray(callback) ? callback : [callback]) : [])
      }
    } catch (err) {
      console.error('Error fetching callbacks modal data:', err)
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  // Copia ligera de formatTranscript usada en AnalysisModal
  const formatTranscript = (transcript: string) => {
    if (!transcript) return null
    const lines = transcript.split('\n')
    return lines.map((line, i) => {
      const agentMatch = line.match(/^(\s*)(agent)(\s*:)/i)
      const userMatch = line.match(/^(\s*)(user)(\s*:)/i)
      if (agentMatch) {
        const [, prefix, word, suffix] = agentMatch
        const rest = line.substring(agentMatch[0].length)
        return (
          <div key={i} className="mb-2">
            <span className="text-theme-text-secondary">{prefix}</span>
            <span className="font-semibold text-theme-primary bg-theme-primary/10 px-1 rounded">{word}</span>
            <span className="text-theme-text-secondary">{suffix}</span>
            <span className="text-theme-text-primary">{rest}</span>
          </div>
        )
      }
      if (userMatch) {
        const [, prefix, word, suffix] = userMatch
        const rest = line.substring(userMatch[0].length)
        return (
          <div key={i} className="mb-2">
            <span className="text-theme-text-secondary">{prefix}</span>
            <span className="font-semibold text-theme-success bg-theme-success/10 px-1 rounded">{word}</span>
            <span className="text-theme-text-secondary">{suffix}</span>
            <span className="text-theme-text-primary">{rest}</span>
          </div>
        )
      }
      return (
        <div key={i} className="mb-2 text-theme-text-primary">
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

  // crear callback para flujo possibly_interested
  const handleCreateCallbackFromPI = async () => {
    try {
      setPiSaving(true)
      setPiError(null)
      let callbackCallId = callId
      try {
        const latest = await getLatestPcaByCallId(callId)
        if (latest && latest.call_id) callbackCallId = latest.call_id
      } catch (e) {
        console.warn('No se pudo obtener PCA para call_id:', e)
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
      setDataChanged(true)
      // cerrar flujo PI
      setPiChoice(null)
    } catch (err) {
      console.error('Error creando callback (PI):', err)
      setPiError('Error guardando los datos')
    } finally {
      setPiSaving(false)
    }
  }

  // cambiar disposition del PCA (cuando humano elige No en PI)
  const handlePiMarkNotInterested = async (disposition = 'not_interested') => {
    try {
      setPiSaving(true)
      setPiError(null)
      // actualizar el PCA más reciente
      const latest = await getLatestPcaByCallId(callId)
      if (latest && latest.id) {
        await updatePcaById(latest.id, { disposition })
        await fetchAll()
        setDataChanged(true)
        setPiChoice(null)
      } else {
        setPiError('No se encontró registro PCA para actualizar')
      }
    } catch (err) {
      console.error('Error actualizando PCA (PI No):', err)
      setPiError('Error actualizando el registro')
    } finally {
      setPiSaving(false)
    }
  }

  // editar callback existente
  const handleSaveCallbackEdit = async (id: string) => {
    try {
      setSaving(true)
      setSaveError(null)
      const normalizedPhone = String(formOwnerPhone || '').replace(/\D/g, '')
      await updateCallbackById(id, {
        callback_owner_name: formOwnerName || undefined,
        callback_owner_phone: normalizedPhone || undefined,
        callback_time_text_raw: formTimeText || undefined,
        disposition: 'callback'
      })
      await fetchAll()
      setDataChanged(true)
      setEditingId(null)
      setIsCallbackChoice(null)
    } catch (err) {
      console.error('Error guardando callback:', err)
      setSaveError('Error guardando los cambios')
    } finally {
      setSaving(false)
    }
  }

  // renderizado principal por pestaña o modo
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">Cargando...</div>
      )
    }

    // modo possibly_interested: transcript-first + pregunta Sí/No
    if (source === 'possibly_interested') {
      return (
        <div className="space-y-4">
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
                  <div className="leading-relaxed text-sm">{formatTranscript(pcaData[0].transcript)}</div>
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

          {/* Pregunta ¿Es callback? */}
          {piChoice === null && (
            <div className="flex items-center gap-3">
              <div className="text-sm">¿Es callback?</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPiChoice(true)} className="px-3 py-1 bg-theme-primary text-white rounded">Sí</button>
                <button onClick={() => setPiChoice(false)} className="px-3 py-1 border rounded">No</button>
              </div>
            </div>
          )}

          {/* Si eligió Sí, mostrar formulario para crear callback */}
          {piChoice === true && (
            <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-theme-text-muted">Nombre del propietario</label>
                  <input value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted">Teléfono propietario</label>
                  <input value={formOwnerPhone} onChange={(e) => setFormOwnerPhone(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-theme-text-muted">Horario solicitado (texto)</label>
                  <input value={formTimeText} onChange={(e) => setFormTimeText(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
              </div>

              {piError && <div className="text-sm text-red-600">{piError}</div>}

              <div className="flex justify-end gap-2">
                <button onClick={() => { setPiChoice(null); setPiError(null) }} className="px-3 py-1 border rounded">Cancelar</button>
                <button onClick={handleCreateCallbackFromPI} disabled={piSaving} className="px-3 py-1 bg-theme-primary text-white rounded">{piSaving ? 'Guardando...' : 'Guardar callback'}</button>
              </div>
            </div>
          )}

          {/* Si eligió No, permitir marcar disposition sin crear callback */}
          {piChoice === false && (
            <div className="bg-white p-4 rounded border border-slate-200 space-y-3">
              <div className="text-sm">Marcar como:</div>
              <div className="flex items-center gap-2">
                <select value={noPickerValue} onChange={(e) => setNoPickerValue(e.target.value)} className="px-2 py-1 border rounded text-sm">
                  <option value="not_interested">not_interested</option>
                  <option value="invalid_number">invalid_number</option>
                  <option value="no_answer">no_answer</option>
                  <option value="owner_not_present">owner_not_present</option>
                </select>
                <button onClick={() => handlePiMarkNotInterested(noPickerValue)} disabled={piSaving} className="px-3 py-1 bg-theme-primary text-white rounded">{piSaving ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setPiChoice(null)} className="px-3 py-1 border rounded">Cancelar</button>
              </div>
              {piError && <div className="text-sm text-red-600">{piError}</div>}
            </div>
          )}
        </div>
      )
    }

    // vista normal (callbacks): pestaña overview / transcript
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          {/* El botón de descarga de audio se muestra únicamente en la pestaña de Transcripción */}
          {pcaData && pcaData[0] && pcaData[0].created_at && (
            <div className="bg-slate-50 rounded p-3 border border-slate-200 text-sm">
              <strong>Día y hora de la llamada:</strong> {formatDate(pcaData[0].created_at)}
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
                <div key={callback.id} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm"><strong>Nombre:</strong> {callback.callback_owner_name || '-'}</p>
                      <p className="text-sm"><strong>Horario:</strong> {callback.callback_time_text_raw || '-'}</p>
                      <p className="text-sm"><strong>Teléfono:</strong> {callback.callback_owner_phone || callback.to_number || '-'}</p>
                      <p className="text-sm"><strong>Uso horario:</strong> {callback.caller_tz || '-'}</p>
                    </div>

                    <div className="flex items-start gap-2 justify-end">
                      <button onClick={() => {
                        setEditingId(callback.id)
                        setIsCallbackChoice(true)
                        setFormOwnerName(callback.callback_owner_name || '')
                        setFormOwnerPhone(callback.callback_owner_phone || callback.to_number || '')
                        setFormTimeText(callback.callback_time_text_raw || callback.callback_time || '')
                        setSaveError(null)
                      }} className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded text-sm">Editar</button>
                    </div>
                  </div>

                  {/* editor inline */}
                  {editingId === callback.id && isCallbackChoice && (
                    <div className="mt-3 bg-white p-3 border border-slate-200 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-theme-text-muted">Nombre del propietario</label>
                          <input value={formOwnerName} onChange={(e) => setFormOwnerName(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-theme-text-muted">Teléfono propietario</label>
                          <input value={formOwnerPhone} onChange={(e) => setFormOwnerPhone(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-theme-text-muted">Horario solicitado (texto)</label>
                          <input value={formTimeText} onChange={(e) => setFormTimeText(e.target.value)} className="w-full px-2 py-2 border rounded text-sm" />
                        </div>
                      </div>

                      {saveError && <div className="text-sm text-red-600">{saveError}</div>}

                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => { setEditingId(null); setIsCallbackChoice(null); setSaveError(null) }} className="px-3 py-1 border rounded text-sm">Cancelar</button>
                        <button onClick={() => editingId && handleSaveCallbackEdit(editingId)} disabled={saving} className="px-3 py-1 bg-theme-primary text-white rounded text-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // pestaña de transcripción
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
              <div className="leading-relaxed text-sm">{formatTranscript(pcaData[0].transcript)}</div>
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
              <h2 className="text-2xl font-bold text-theme-text-primary">Callbacks</h2>
            </div>
            <p className="text-theme-text-secondary font-mono text-sm">Llamada ID: {callId}</p>
          </div>
          <button onClick={() => onClose(dataChanged)} className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pestañas compactas (omitimos cuando venimos de possibly_interested: dejamos transcript arriba) */}
        {source === 'possibly_interested' ? (
          <div className="px-8 pb-4" />
        ) : (
          <div className="px-8 pb-4">
            <div className="mt-3 flex space-x-1">
              {[{ id: 'overview', label: 'Vista General' }, { id: 'transcript', label: 'Transcripción' }].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ${activeTab === tab.id ? 'bg-theme-primary text-white' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10'}`}>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">{renderContent()}</div>

        <div className="flex justify-end p-8 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white/50">
          <button onClick={() => onClose(dataChanged)} className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl">Cerrar</button>
        </div>
      </div>
    </div>
  )
}