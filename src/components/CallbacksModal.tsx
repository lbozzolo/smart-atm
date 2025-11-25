"use client"

import { useEffect, useState } from 'react'
import {
  createSupabaseClient,
  getCallbacksByCallId,
  getCallDetailsWithPCA,
  updateCallbackById,
  createCallback,
  getLatestPcaByCallId,
  updatePcaById,
  getLatestPcaTranscriptByCallId,
  getCallBasicWithLead,
  getActivityLogs,
  createActivityLog,
  type Callback,
  type PCA,
  type ActivityLog
} from '@/lib/supabase'
import DISPOSITIONS from '@/config/dispositions'

interface CallbacksModalProps {
  isOpen: boolean
  // onClose may receive a boolean indicating whether the parent should reload data
  onClose: (shouldReload?: boolean) => void
  callId: string
  source?: 'possibly_interested'
  // Para navegación entre múltiples casos
  allCallIds?: string[]
  onNavigate?: (callId: string) => void
}

export default function CallbacksModal({ isOpen, onClose, callId, source, allCallIds, onNavigate }: CallbacksModalProps) {
  const supabase = createSupabaseClient()
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pcaData, setPcaData] = useState<PCA[]>([])
  const [callData, setCallData] = useState<any>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Indica si durante la sesión del modal se hicieron cambios que requieren recargar la lista
  const [dataChanged, setDataChanged] = useState(false)

  // Cache para prefetching - mantiene datos precargados en memoria
  const [dataCache, setDataCache] = useState<Map<string, {
    pcaData: PCA[]
    callData: any
    callbacks: Callback[]
    activityLogs: ActivityLog[]
  }>>(new Map())

  // pestañas
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'activity'>('overview')

  // edición de callback
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCallbackChoice, setIsCallbackChoice] = useState<boolean | null>(null)
  const [formOwnerName, setFormOwnerName] = useState('')
  const [formOwnerPhone, setFormOwnerPhone] = useState('')
  const [formTimeText, setFormTimeText] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  
  const MAX_COMMENT_LENGTH = 1000

  const CALLBACK_STATUSES = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'completed', label: 'Completado' },
    { value: 'retry_scheduled', label: 'Reintento Programado' },
    { value: 'cancelled', label: 'Cancelado' }
  ]

  // possibly_interested flow states
  const [piChoice, setPiChoice] = useState<boolean | null>(null)
  const [piSaving, setPiSaving] = useState(false)
  const [piError, setPiError] = useState<string | null>(null)

  // valor temporal usado en el flujo posiblemente_interesado para marcar como not_interested u otras
  const [noPickerValue, setNoPickerValue] = useState('not_interested')

  // Opciones para el picker 'No' en el flujo posiblemente_interesado - filtrando 'possibly_interested' ya que no tiene sentido en este contexto
  const NO_PICKER_DEFAULTS = DISPOSITIONS.filter(d => d !== 'possibly_interested')

  // Atajos de teclado para navegación
  useEffect(() => {
    if (!isOpen || !allCallIds || !onNavigate) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }

      const currentIndex = allCallIds.indexOf(callId)
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        onNavigate(allCallIds[currentIndex - 1])
      } else if (e.key === 'ArrowRight' && currentIndex < allCallIds.length - 1) {
        e.preventDefault()
        onNavigate(allCallIds[currentIndex + 1])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, callId, allCallIds, onNavigate])

  const fetchAll = async (targetCallId: string, updateState: boolean = true) => {
    try {
      // Primero verificar si ya está en cache
      const cached = dataCache.get(targetCallId)
      if (cached && updateState) {
        setPcaData(cached.pcaData)
        setCallData(cached.callData)
        setCallbacks(cached.callbacks)
        setActivityLogs(cached.activityLogs)
        setLoading(false)
        return
      }

      if (updateState) {
        setLoading(true)
        setError(null)
      }

      // si venimos desde posiblemente_interesado, usamos consultas ligeras
      if (source === 'possibly_interested') {
        const latestPca = await getLatestPcaTranscriptByCallId(targetCallId)
        const callBasic = await getCallBasicWithLead(targetCallId)
        const cbs = await getCallbacksByCallId(targetCallId)
        const logs = await getActivityLogs(undefined, targetCallId)
        
        const data = {
          pcaData: latestPca ? [latestPca] as any : [],
          callData: callBasic ?? null,
          callbacks: cbs ?? [],
          activityLogs: logs
        }
        
        // Guardar en cache
        setDataCache(prev => new Map(prev).set(targetCallId, data))
        
        // Actualizar el estado si se solicitó
        if (updateState) {
          setPcaData(data.pcaData)
          setCallData(data.callData)
          setCallbacks(data.callbacks)
          setActivityLogs(data.activityLogs)
        }
      } else {
        // vista normal: traer detalles completos
        const { call, pca, callback } = await getCallDetailsWithPCA(targetCallId)
        const logs = await getActivityLogs(undefined, targetCallId)
        
        const data = {
          pcaData: pca ?? [],
          callData: call ?? null,
          callbacks: callback ? (Array.isArray(callback) ? callback : [callback]) : [],
          activityLogs: logs
        }
        
        // Guardar en cache
        setDataCache(prev => new Map(prev).set(targetCallId, data))
        
        // Actualizar el estado si se solicitó
        if (updateState) {
          setPcaData(data.pcaData)
          setCallData(data.callData)
          setCallbacks(data.callbacks)
          setActivityLogs(data.activityLogs)
        }
      }
    } catch (err) {
      console.error('Error fetching callbacks modal data:', err)
      if (updateState) {
        setError('Error cargando datos')
      }
    } finally {
      if (updateState) {
        setLoading(false)
      }
    }
  }

  // Función para precargar el siguiente
  const prefetchNext = () => {
    if (!allCallIds) return
    
    const currentIndex = allCallIds.indexOf(callId)
    if (currentIndex >= 0 && currentIndex < allCallIds.length - 1) {
      const nextCallId = allCallIds[currentIndex + 1]
      // Solo precargar si no está ya en cache
      if (!dataCache.has(nextCallId)) {
        fetchAll(nextCallId, false) // false = no actualizar estado, solo cachear
      }
    }
  }

  // Efecto principal: cargar actual + precargar siguiente
  useEffect(() => {
    if (isOpen && callId) {
      fetchAll(callId, true) // true = actualizar estado
      // Reset del estado de elección cuando cambia el callId
      setPiChoice(null)
      setPiError(null)
      setFormOwnerName('')
      setFormOwnerPhone('')
      setFormTimeText('')
      
      // Precargar el siguiente después de un pequeño delay
      setTimeout(() => prefetchNext(), 100)
    }
  }, [isOpen, callId])

  // Limpiar cache al cerrar el modal para no consumir memoria
  useEffect(() => {
    if (!isOpen) {
      setDataCache(new Map())
    }
  }, [isOpen])

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

  // crear callback para flujo posiblemente_interesado
  const handleCreateCallbackFromPI = async () => {
    try {
      setPiSaving(true)
      setPiError(null)
      
      // Para posiblemente_interesado, el callId que recibimos es el call_id de la tabla calls
      // Usamos directamente ese callId
      await createCallback({
        call_id: callId, // Usar directamente el callId del prop, no del PCA
        callback_owner_name: formOwnerName || undefined,
        callback_owner_phone: formOwnerPhone || undefined,
        callback_time_text_raw: formTimeText || undefined,
        to_number: callData?.to_number || undefined,
        caller_tz: (callData as any)?.lead_timezone || undefined, // Usar el timezone del lead
        disposition: 'callback'
      })

      // Buscar el lead_id asociado a esta llamada si existe
      let leadId = null
      if (callData?.to_number) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone_number', callData.to_number)
          .single()
        if (lead) leadId = lead.id
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await createActivityLog({
          call_id: callId,
          lead_id: leadId || undefined,
          user_id: user.id,
          content: 'Callback creado',
          activity_type: 'status_change'
        })
      }

      await fetchAll(callId, true)
      setDataChanged(true)
      // cerrar flujo PI
      setPiChoice(null)
      
      // Auto-avance: ir al siguiente si existe
      if (allCallIds && onNavigate) {
        const currentIndex = allCallIds.indexOf(callId)
        if (currentIndex < allCallIds.length - 1) {
          setTimeout(() => onNavigate(allCallIds[currentIndex + 1]), 300)
        }
      }
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
        
        // Buscar el lead_id asociado a esta llamada si existe
        let leadId = null
        if (callData?.to_number) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id')
            .eq('phone_number', callData.to_number)
            .single()
          if (lead) leadId = lead.id
        }

        // Log activity
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await createActivityLog({
            call_id: callId,
            lead_id: leadId || undefined,
            user_id: user.id,
            content: `Marcado como ${disposition}`,
            activity_type: 'status_change'
          })
        }

        await fetchAll(callId, true)
        setDataChanged(true)
        setPiChoice(null)
        
        // Auto-avance: ir al siguiente si existe
        if (allCallIds && onNavigate) {
          const currentIndex = allCallIds.indexOf(callId)
          if (currentIndex < allCallIds.length - 1) {
            setTimeout(() => onNavigate(allCallIds[currentIndex + 1]), 300)
          }
        }
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
      const updatedCallback = await updateCallbackById(id, {
        callback_owner_name: formOwnerName || undefined,
        callback_owner_phone: normalizedPhone || undefined,
        callback_time_text_raw: formTimeText || undefined,
        status: formStatus || undefined,
        disposition: 'callback'
      })

      // Actualizar estado local inmediatamente para feedback visual
      let newCallbacks = callbacks
      if (updatedCallback) {
        newCallbacks = callbacks.map(c => c.id === id ? { ...c, ...updatedCallback } : c)
        setCallbacks(newCallbacks)
      }

      // Buscar el lead_id asociado a esta llamada si existe
      let leadId = null
      if (callData?.to_number) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone_number', callData.to_number)
          .single()
        if (lead) leadId = lead.id
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const statusLabel = CALLBACK_STATUSES.find(s => s.value === formStatus)?.label || formStatus
        await createActivityLog({
          call_id: callId,
          lead_id: leadId || undefined,
          user_id: user.id,
          content: `Callback actualizado. Estado: ${statusLabel}`,
          activity_type: 'status_change'
        })
      }

      // En lugar de recargar todo (que puede traer datos viejos por latencia),
      // solo actualizamos los logs y el cache local con los datos que ya tenemos.
      const logs = await getActivityLogs(undefined, callId)
      setActivityLogs(logs)

      // Actualizar cache para evitar reversión al navegar
      setDataCache(prev => {
        const existing = prev.get(callId)
        if (!existing) return prev
        return new Map(prev).set(callId, {
          ...existing,
          callbacks: newCallbacks,
          activityLogs: logs
        })
      })

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

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    try {
      setCommenting(true)
      // Intentar obtener usuario de la sesión actual
      let { data: { user } } = await supabase.auth.getUser()
      
      // Si no hay usuario (posiblemente por el cliente anon), intentar obtener sesión
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
      }
      
      if (!user) {
        console.error('No user found in auth context')
        alert('No se pudo identificar al usuario. Por favor recarga la página.')
        return
      }

      // Buscar el lead_id asociado a esta llamada si existe
      let leadId = null
      if (callData?.to_number) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone_number', callData.to_number)
          .single()
        if (lead) leadId = lead.id
      }

      const log = await createActivityLog({
        call_id: callId,
        lead_id: leadId || undefined, // Pasar lead_id si existe
        user_id: user.id,
        content: newComment,
        activity_type: 'comment'
      })

      if (log) {
        // Fetch user profile to display immediately
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        const newLog = { ...log, user: profile }
        
        setActivityLogs(prev => [newLog, ...prev])
        setNewComment('')
        
        // Update cache
        const cached = dataCache.get(callId)
        if (cached) {
          cached.activityLogs = [newLog, ...cached.activityLogs]
          setDataCache(new Map(dataCache).set(callId, cached))
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      alert('Error al guardar el comentario')
    } finally {
      setCommenting(false)
    }
  }

  // renderizado principal por pestaña o modo
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center">Cargando...</div>
      )
    }

    // modo posiblemente_interesado: pregunta arriba + transcript
    if (source === 'possibly_interested' && activeTab === 'overview') {
      return (
        <div className="space-y-4">
          {/* Información de la llamada y el lead */}
          <div className="bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información de la llamada
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {/* Fecha y hora de la llamada */}
              {pcaData && pcaData[0] && pcaData[0].created_at && (
                <div>
                  <span className="text-slate-500">Fecha/Hora:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {formatDate(pcaData[0].created_at)}
                  </span>
                </div>
              )}
              
              {/* Datos del lead */}
              {callData?.to_number && (
                <div>
                  <span className="text-slate-500">Teléfono:</span>
                  <span className="ml-2 font-medium text-slate-800">{callData.to_number}</span>
                </div>
              )}
              
              {(callData as any)?.lead_business_name && (
                <div>
                  <span className="text-slate-500">Negocio:</span>
                  <span className="ml-2 font-medium text-slate-800">{(callData as any).lead_business_name}</span>
                </div>
              )}
              
              {(callData as any)?.lead_timezone && (
                <div>
                  <span className="text-slate-500">Zona horaria:</span>
                  <span className="ml-2 font-medium text-slate-800">{(callData as any).lead_timezone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pregunta ¿Es callback? o formulario según elección */}
          <div className="bg-white rounded-lg border-2 border-theme-primary/20 p-4 shadow-sm sticky top-0 z-10">
            {piChoice === null && (
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-theme-text-primary">¿Es callback?</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPiChoice(true)} 
                    className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 font-medium transition-colors"
                  >
                    Sí
                  </button>
                  <button 
                    onClick={() => setPiChoice(false)} 
                    className="px-4 py-2 border-2 border-theme-border rounded-lg hover:bg-theme-surface-hover font-medium transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {/* Si eligió Sí, mostrar formulario para crear callback */}
            {piChoice === true && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-semibold text-theme-text-primary">Configurar Callback</h3>
                  <button 
                    onClick={() => { setPiChoice(null); setPiError(null) }} 
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre del propietario
                    </label>
                    <input 
                      autoFocus
                      value={formOwnerName} 
                      onChange={(e) => setFormOwnerName(e.target.value)} 
                      placeholder="Ej: Juan Pérez"
                      className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Teléfono propietario
                    </label>
                    <input 
                      value={formOwnerPhone} 
                      onChange={(e) => setFormOwnerPhone(e.target.value)} 
                      placeholder="Ej: 555-1234"
                      className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Horario solicitado
                    </label>
                    <input 
                      value={formTimeText} 
                      onChange={(e) => setFormTimeText(e.target.value)} 
                      placeholder="Ej: mañana 10am"
                      className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {piError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {piError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => { setPiChoice(null); setPiError(null) }} 
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateCallbackFromPI} 
                    disabled={piSaving}
                    className="px-6 py-3 bg-theme-primary text-white font-medium rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {piSaving ? 'Guardando...' : 'Guardar callback'}
                  </button>
                </div>
              </div>
            )}

            {/* Si eligió No, permitir marcar disposition sin crear callback */}
            {piChoice === false && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-semibold text-theme-text-primary">Marcar disposición</h3>
                  <button 
                    onClick={() => setPiChoice(null)} 
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">Selecciona disposición:</label>
                  <select 
                    value={noPickerValue} 
                    onChange={(e) => setNoPickerValue(e.target.value)} 
                    className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 focus:outline-none"
                  >
                    {NO_PICKER_DEFAULTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {piError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {piError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setPiChoice(null)} 
                    className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handlePiMarkNotInterested(noPickerValue)} 
                    disabled={piSaving} 
                    className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 font-medium transition-colors disabled:opacity-50"
                  >
                    {piSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transcripción */}
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
                <div className="bg-slate-50 rounded p-3 border border-slate-200 max-h-[400px] overflow-y-auto">
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
                      <p className="text-sm">
                        <strong>Estado:</strong> 
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${callback.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            callback.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            callback.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                          {CALLBACK_STATUSES.find(s => s.value === callback.status)?.label || callback.status || 'Pendiente'}
                        </span>
                      </p>
                      {callback.resolver && (
                        <p className="text-sm mt-1 text-slate-500">
                          <strong>Resuelto por:</strong> {callback.resolver.full_name || callback.resolver.email}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 justify-end">
                      <button onClick={() => {
                        setEditingId(callback.id)
                        setIsCallbackChoice(true)
                        setFormOwnerName(callback.callback_owner_name || '')
                        setFormOwnerPhone(callback.callback_owner_phone || callback.to_number || '')
                        setFormTimeText(callback.callback_time_text_raw || callback.callback_time || '')
                        setFormStatus(callback.status || 'pending')
                        setSaveError(null)
                      }} className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded text-sm">Editar</button>
                    </div>
                  </div>

                  {/* editor inline */}
                  {editingId === callback.id && isCallbackChoice && (
                    <div className="mt-3 bg-white p-3 border border-slate-200 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <div>
                          <label className="block text-xs text-theme-text-muted">Estado</label>
                          <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full px-2 py-2 border rounded text-sm bg-white">
                            {CALLBACK_STATUSES.map(status => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
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
    if (activeTab === 'transcript') {
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

    // pestaña de actividad
    if (activeTab === 'activity') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Historial de Actividad</h3>
            
            <div className="mb-6">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="Escribe un comentario..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary outline-none min-h-[80px] resize-y"
                />
                <div className={`absolute bottom-2 right-2 text-xs ${newComment.length >= MAX_COMMENT_LENGTH ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                  {newComment.length}/{MAX_COMMENT_LENGTH}
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commenting}
                  className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commenting ? 'Guardando...' : 'Agregar Comentario'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {activityLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No hay actividad registrada</p>
              ) : (
                activityLogs.map((log) => {
                  const isStatusChange = log.activity_type === 'status_change'
                  return (
                    <div key={log.id} className={`flex space-x-3 border-b border-slate-100 last:border-0 pb-4 last:pb-0 ${isStatusChange ? 'bg-blue-50/50 -mx-2 px-2 py-3 rounded-lg border-none' : ''}`}>
                      <div className="flex-shrink-0">
                        {isStatusChange ? (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                        ) : log.user?.avatar_url ? (
                          <img src={log.user.avatar_url} alt={log.user.full_name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {log.user?.full_name ? log.user.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium text-sm ${isStatusChange ? 'text-blue-900' : 'text-slate-900'}`}>
                            {log.user?.full_name || 'Usuario desconocido'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${isStatusChange ? 'text-blue-800 font-medium' : 'text-slate-700'}`}>
                          {log.content}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )
    }
  }

  if (!isOpen) return null

  // Calcular posición actual para navegación
  const currentIndex = allCallIds ? allCallIds.indexOf(callId) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < (allCallIds?.length || 0) - 1
  const totalCount = allCallIds?.length || 0

  const handlePrevious = () => {
    if (hasPrevious && allCallIds && onNavigate) {
      onNavigate(allCallIds[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (hasNext && allCallIds && onNavigate) {
      onNavigate(allCallIds[currentIndex + 1])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-theme-surface backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-border animate-in slide-in-from-bottom duration-300">
        <div className="flex-shrink-0 flex justify-between items-center p-8 border-b border-theme-border bg-theme-surface-hover">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-2xl font-bold text-theme-text-primary">Callbacks</h2>
              {totalCount > 0 && (
                <span className="px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm font-medium">
                  {currentIndex + 1} de {totalCount}
                </span>
              )}
            </div>
            <p className="text-theme-text-secondary font-mono text-sm">Llamada ID: {callId}</p>
          </div>

          {/* Botones de navegación */}
          {allCallIds && allCallIds.length > 1 && (
            <div className="flex items-center gap-2 mx-4">
              <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Anterior (←)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Siguiente (→)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          <button onClick={() => onClose(dataChanged)} className="w-10 h-10 flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10 rounded-full transition-all duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pestañas compactas */}
        <div className="flex-shrink-0 px-8 pb-4">
          <div className="mt-3 flex space-x-1">
            {[{ id: 'overview', label: 'Vista General' }, { id: 'transcript', label: 'Transcripción' }, { id: 'activity', label: 'Actividad' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ${activeTab === tab.id ? 'bg-theme-primary text-white' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-primary/10'}`}>
                <span>{tab.label}</span>
                {tab.id === 'activity' && activityLogs.length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {activityLogs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto min-h-0">{renderContent()}</div>

        <div className="flex-shrink-0 flex justify-between items-center p-8 border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-white/50">
          {allCallIds && allCallIds.length > 1 ? (
            <div className="text-xs text-theme-text-muted flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Usa las flechas ← → para navegar entre casos</span>
            </div>
          ) : (
            <div />
          )}
          <button onClick={() => onClose(dataChanged)} className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl">Cerrar</button>
        </div>
      </div>
    </div>
  )
}