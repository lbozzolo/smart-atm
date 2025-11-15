
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para uso general (mantener compatibilidad)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para autenticación en el navegador
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)

// Definir el tipo de datos para la tabla calls
export interface Call {
  call_id: string
  agent_id?: string
  agent_name?: string
  transcript?: string
  disposition?: string
  business_name?: string
  owner_name?: string
  owner_phone?: string
  owner_email?: string
  location_type?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  agreed_amount?: number
  monthly_amount?: number
  yearly_amount?: number
  company_key?: string
  agent_external_id?: string
  address_line2?: string
  business_hours?: string
  other_locations?: string
  from_number?: string
  to_number?: string
  created_at?: string
}

// Tipo extendido para llamadas con información de PCA
export interface CallWithPCAInfo extends Call {
  hasPCA: boolean
  hasCallbacks?: boolean
  duration_ms?: number
  call_successful?: boolean
  disconnection_reason?: string | null
  lead_phone?: string | null
}

// Definir el tipo de datos para la tabla callbacks
export interface Callback {
  id: string
  id_uuid_old: string
  created_at: string
  updated_at: string
  lead_id?: string
  call_id?: string
  company_id?: string
  agent_id?: string
  disposition?: string
  callback_owner_name?: string
  callback_owner_phone?: string
  callback_time?: string
  callback_window_note?: string
  payload?: any
  agent_external_id?: string
  lead_state?: string
  lead_city?: string
  lead_zip?: string
  call_started_at?: string
  caller_tz?: string
  tz_ambiguous?: boolean
  callback_time_text_raw?: string
  event_type?: string
  from_number?: string
  to_number?: string
}

// Definir el tipo de datos para la tabla pca
export interface PCA {
  id: string
  created_at: string
  call_id: string
  agent_name?: string
  disposition?: string
  call_successful?: boolean
  user_sentiment?: string
  duration_ms?: number
  start_timestamp?: string
  end_timestamp?: string
  disconnection_reason?: string
  call_summary?: string
  transcript?: string
  recording_url?: string
  recording_multi_channel_url?: string
  public_log_url?: string
  call_cost?: number
  analysis?: any
  custom_analysis_data?: any
  llm_token_usage?: any
  updated_at: string
  agent_external_id?: string
  from_number?: string
  to_number?: string
}

// Función para obtener todas las llamadas
export async function getCalls() {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('call_id', { ascending: false })

  if (error) {
    throw error
  }

  return data as Call[]
}

// Función para obtener llamadas con información de si tienen PCA
export async function getCallsWithPCAInfo(): Promise<CallWithPCAInfo[]> {
  try {
    // Primero obtenemos todas las llamadas
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .order('call_id', { ascending: false })

    if (callsError) {
      console.error('Error fetching calls:', callsError)
      throw callsError
    }

    if (!calls) return []

    // Luego obtenemos todos los call_ids que tienen PCA
    const { data: pcaData, error: pcaError } = await supabase
      .from('pca')
      .select('call_id')

    if (pcaError) {
      console.error('Error fetching PCA data:', pcaError)
      // No lanzamos error aquí, solo logueamos y continuamos sin PCA info
    }

    const callsWithPCA = new Set(pcaData?.map(pca => pca.call_id) || [])

    // Combinamos la información
    return calls.map(call => ({
      ...call,
      hasPCA: callsWithPCA.has(call.call_id),
      hasCallbacks: false // Ya no usamos callbacks como concepto
    }))
  } catch (error) {
    console.error('Error in getCallsWithPCAInfo:', error)
    throw error
  }
}

// 📊 PAGINACIÓN ESCALABLE PARA PRODUCCIÓN

// Interfaz para parámetros de paginación
export interface PaginationParams {
  page: number
  limit: number
  search?: string
  filters?: {
    hasPCA?: boolean
    disposition?: string
    dateFrom?: string
    dateTo?: string
    callIds?: string[]
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Interfaz para respuesta paginada
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Función NUEVA: Obtener llamadas con paginación en servidor (ESCALABLE)
export async function getCallsWithPagination(params: PaginationParams): Promise<PaginatedResponse<CallWithPCAInfo>> {
  try {
    console.log('🔍 Obteniendo llamadas paginadas:', params)
    
    // Seleccionar solo las columnas que usamos en la UI para reducir transferencia
    let query = supabase
      .from('calls')
      .select('call_id,to_number,business_name,created_at,owner_name,owner_phone,disposition,agreed_amount,monthly_amount,company_key', { count: 'exact' })

    // Aplicar filtros de búsqueda
    if (params.search) {
      query = query.or(`business_name.ilike.%${params.search}%,owner_name.ilike.%${params.search}%,owner_phone.ilike.%${params.search}%,owner_email.ilike.%${params.search}%,address_street.ilike.%${params.search}%,call_id.ilike.%${params.search}%`)
    }

    // Filtrar por callIds si está presente (solo llamadas con callback)
    if (params.filters?.callIds && params.filters.callIds.length > 0) {
      query = query.in('call_id', params.filters.callIds)
    }

    // Aplicar filtros de fecha
    if (params.filters?.dateFrom) {
      query = query.gte('created_at', params.filters.dateFrom)
    }
    if (params.filters?.dateTo) {
      // Agregar 23:59:59 al final del día para incluir todo el día
      const endOfDay = `${params.filters.dateTo}T23:59:59.999Z`
      query = query.lte('created_at', endOfDay)
    }

    // NOTA: El filtro de disposition se aplicará después de combinar datos
    // porque disposition puede venir de calls, pca, o callbacks

    // NOTA: Para disposition, no podemos ordenar aquí porque el valor final viene de múltiples tablas
    // En su lugar, ordenaremos en memoria después de combinar los datos
    const shouldSortByDisposition = params.sortBy === 'disposition'
    
    // Determinar si necesitamos aplicar filtros post-query
  const needsPostQueryFiltering = params.filters?.disposition || shouldSortByDisposition
    
    // Aplicar ordenamiento (excepto para disposition)
    if (!shouldSortByDisposition) {
      const sortBy = params.sortBy || 'call_id'
      const sortOrder = params.sortOrder === 'asc' ? { ascending: true } : { ascending: false }
      query = query.order(sortBy, sortOrder)
    } else {
      // Para disposition, usar un ordenamiento temporal por call_id
      query = query.order('call_id', { ascending: false })
    }

    // Si el filtro es por disposition, es más eficiente consultar PCA primero
    // y luego usar los call_id resultantes para filtrar la tabla calls en el servidor.
    if (params.filters?.disposition) {
      try {
        // Construir consulta a PCA respetando el rango de fechas si fueron provistos
        let pcaQ: any = supabase.from('pca').select('call_id, created_at').eq('disposition', params.filters.disposition)
        if (params.filters.dateFrom) pcaQ = pcaQ.gte('created_at', params.filters.dateFrom)
        if (params.filters.dateTo) pcaQ = pcaQ.lte('created_at', `${params.filters.dateTo}T23:59:59.999Z`)
        // No pedir más de un cierto límite razonable para evitar sobrecargar la API
        const PCA_PRE_QUERY_LIMIT = 20000
        const pcaStart = Date.now()
        const { data: pcaMatch, error: pcaMatchErr } = await pcaQ.limit(PCA_PRE_QUERY_LIMIT)
        const pcaElapsed = Date.now() - pcaStart
        if (pcaMatchErr) {
          console.warn('Warning: could not fetch matching PCA for disposition filter:', pcaMatchErr)
        }
        const matchedCallIds = Array.isArray(pcaMatch) ? Array.from(new Set(pcaMatch.map((r: any) => r.call_id).filter(Boolean))) : []
        // Si el conjunto de call_ids es demasiado grande, evitar construir un IN enorme
        const IN_FALLBACK_THRESHOLD = 3000
        if (matchedCallIds.length === 0) {
          return {
            data: [],
            total: 0,
            page: params.page,
            limit: params.limit,
            totalPages: 0
          }
        } else if (matchedCallIds.length > IN_FALLBACK_THRESHOLD) {
          console.warn(`Large matchedCallIds (${matchedCallIds.length}) for disposition filter (took ${pcaElapsed}ms). Falling back to post-query filtering to avoid huge IN clauses.`)
          // Aplicar paginación normal y luego filtrado post-query (comportamiento previo)
          const offset = (params.page - 1) * params.limit
          query = query.range(offset, offset + params.limit - 1)
        } else {
          // Limitar el set de calls a los que aparecen en pca con la disposition solicitada
          query = query.in('call_id', matchedCallIds)
          // Ahora que hemos restringido por call_id, podemos aplicar paginación en el servidor
          const offset = (params.page - 1) * params.limit
          query = query.range(offset, offset + params.limit - 1)
        }
      } catch (err) {
        console.warn('Error optimizing disposition filter via PCA pre-query, falling back to default:', err)
        const offset = (params.page - 1) * params.limit
        query = query.range(offset, offset + params.limit - 1)
      }
    } else {
      // Aplicar paginación normal para otros casos
      const offset = (params.page - 1) * params.limit
      query = query.range(offset, offset + params.limit - 1)
    }

    const { data: calls, count, error: callsError } = await query

    if (callsError) {
      console.error('Error fetching paginated calls:', callsError)
      throw callsError
    }

    if (!calls || calls.length === 0) {
      return {
        data: [],
        total: count || 0,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil((count || 0) / params.limit)
      }
    }

    // Obtener información de PCA solo para las llamadas de esta página
    const callIds = calls.map(call => call.call_id)
    const { data: pcaData, error: pcaError } = await supabase
  .from('pca')
  .select('call_id, disposition, duration_ms, disconnection_reason, call_successful, created_at')
  .in('call_id', callIds)
  .order('created_at', { ascending: false })

    // Construir mapas tomando la PCA más reciente por call_id (primera aparición)
    const pcaDurationMap = new Map<string, number | null>()
    const pcaDisconnectionMap = new Map<string, string | null>()
    const pcaCallSuccessMap = new Map<string, boolean | null>()
    const pcaDispositionMap_temp = new Map<string, string | null>()

    if (pcaData && Array.isArray(pcaData)) {
      for (const p of pcaData) {
        if (!pcaDispositionMap_temp.has(p.call_id)) {
          pcaDurationMap.set(p.call_id, p.duration_ms ?? null)
          pcaDisconnectionMap.set(p.call_id, p.disconnection_reason ?? null)
          pcaCallSuccessMap.set(p.call_id, typeof p.call_successful === 'boolean' ? p.call_successful : null)
          pcaDispositionMap_temp.set(p.call_id, p.disposition ?? null)
        }
      }
    }

    if (pcaError) {
      console.error('Error fetching PCA data:', pcaError)
    }

    // Obtener callbacks asociados a estas calls
    const { data: callbackData, error: callbackError } = await supabase
      .from('callbacks')
      .select('call_id, callback_owner_name, to_number')
      .in('call_id', callIds)

    if (callbackError) {
      console.error('Error fetching callback data:', callbackError)
    }



    const callsWithPCA = new Set(pcaData?.map(pca => pca.call_id) || [])
    const pcaDispositionMap = pcaDispositionMap_temp

    // Nuevo: intentar rellenar business_name desde la tabla leads cuando falte
    try {
      const callToNumbers = calls.map((c: any) => c.to_number).filter(Boolean)
      let leadsData: any[] = []
      if (callToNumbers.length > 0) {
        const { data: ld, error: ldErr } = await supabase
          .from('leads')
          .select('phone_number, business_name')
          .in('phone_number', callToNumbers)

        if (ldErr) {
          console.warn('Warning fetching leads for business_name fill:', ldErr)
        } else if (ld) {
          leadsData = ld
        }
      }

  // Mapear phone_number -> lead row completo para usar más campos (business_name, phone, owner, etc.)
  const leadMap = new Map((leadsData || []).map(l => [l.phone_number, l]))

  // Cuando combinemos abajo podemos preferir call.business_name || leadMap.get(call.to_number)?.business_name
  // También podremos rellenar lead_phone desde leadMap
  // attach to a local variable for use later
  var _leadMap_for_calls = leadMap
    } catch (err) {
      console.error('Error fetching leads to fill business_name:', err)
    }
    
    // Crear mapas separados para nombre y teléfono
    const callbackOwnerNameMap = new Map(
      (callbackData || []).map(callback => [callback.call_id, callback.callback_owner_name])
    )
    const callbackOwnerPhoneMap = new Map(
      (callbackData || []).map(callback => [callback.call_id, callback.to_number])
    )

    // Combinar información
    const callsWithInfo: CallWithPCAInfo[] = calls.map(call => {
      const callbackOwnerName = callbackOwnerNameMap.get(call.call_id)
      const callbackOwnerPhone = callbackOwnerPhoneMap.get(call.call_id)
      const pcaDisposition = pcaDispositionMap.get(call.call_id)
      // Preferir business_name existente en call, si no existe usar el mapping desde leads
      let businessName = call.business_name
      try {
        if ((!businessName || businessName === '') && typeof _leadMap_for_calls !== 'undefined') {
          const leadRow = _leadMap_for_calls.get(call.to_number)
          businessName = (leadRow && leadRow.business_name) || businessName
        }
      } catch (e) {
        // ignore
      }

      return {
        ...call,
        business_name: businessName,
        owner_name: callbackOwnerName || call.owner_name,
        owner_phone: callbackOwnerPhone || call.owner_phone,
        lead_phone: (typeof _leadMap_for_calls !== 'undefined' && _leadMap_for_calls.get(call.to_number)?.phone_number) || null,
        disposition: pcaDisposition || call.disposition,
        hasPCA: callsWithPCA.has(call.call_id),
        hasCallbacks: callbackOwnerNameMap.has(call.call_id),
        duration_ms: pcaDurationMap.get(call.call_id) || null,
        call_successful: pcaCallSuccessMap.get(call.call_id) ?? call.call_successful ?? null,
        disconnection_reason: pcaDisconnectionMap.get(call.call_id) || null
      }
    })

    // Aplicar filtros post-query si es necesario
    let filteredCalls = callsWithInfo
    if (params.filters?.hasPCA !== undefined) {
      filteredCalls = filteredCalls.filter(call => call.hasPCA === params.filters!.hasPCA)
    }

    // Filtrar por disposition (busca en disposition final combinado)
    if (params.filters?.disposition) {
      filteredCalls = filteredCalls.filter(call => 
        call.disposition?.toLowerCase() === params.filters!.disposition!.toLowerCase()
      )
    }

  // Calcular el total correcto después de aplicar filtros
  // Si no se aplicó filtrado post-query, la consulta al servidor devolvió `count` con el total
  // completo; en ese caso preferimos usar `count` para calcular totalPages. Si se aplicó
  // filtrado post-query, `filteredCalls.length` ya representa el total después del filtro.
  const finalTotal = needsPostQueryFiltering ? filteredCalls.length : (count || filteredCalls.length)
    
    // Si el ordenamiento es por disposition, hacerlo aquí después de combinar los datos
    if (params.sortBy === 'disposition') {
      filteredCalls.sort((a, b) => {
        const dispA = a.disposition || ''
        const dispB = b.disposition || ''
        
        if (params.sortOrder === 'asc') {
          return dispA.localeCompare(dispB)
        } else {
          return dispB.localeCompare(dispA)
        }
      })
    }
    
    // Aplicar paginación manual si se necesitó filtrado post-query
    if (needsPostQueryFiltering) {
      const offset = (params.page - 1) * params.limit
      filteredCalls = filteredCalls.slice(offset, offset + params.limit)
    }

    const totalPages = Math.ceil(finalTotal / params.limit)

    console.log(`✅ Devolviendo ${filteredCalls.length} llamadas (página ${params.page}/${totalPages}) de ${finalTotal} total`)
    
    return {
      data: filteredCalls,
      total: finalTotal,
      page: params.page,
      limit: params.limit,
      totalPages
    }
  } catch (error) {
    console.error('Error in getCallsWithPagination:', error)
    throw error
  }
}

// Función para obtener callbacks por call_id
export async function getCallbacksByCallId(callId: string): Promise<Callback[]> {
  try {
    const { data, error } = await supabase
      .from('callbacks')
      .select('*')
      .eq('call_id', callId)
      // Order by created_at (callback_date field does not exist in table schema)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching callbacks:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getCallbacksByCallId:', error)
    throw error
  }
}

// Obtener callbacks paginados (útil para la UI de administración)
export interface CallbacksFilterParams {
  search?: string
  disposition?: string
  dateFrom?: string // ISO date string (inclusive)
  dateTo?: string // ISO date string (inclusive)
  owner?: string
}

export async function getAllCallbacks(page = 1, limit = 50, filters?: CallbacksFilterParams) {
  try {
    const offset = (page - 1) * limit

    let query: any = supabase
      .from('callbacks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply search across common text fields
    if (filters?.search) {
      const s = filters.search.replace(/%/g, '\\%')
      query = query.or(`to_number.ilike.%${s}%,callback_owner_name.ilike.%${s}%,callback_time_text_raw.ilike.%${s}%`)
    }

    if (filters?.disposition) {
      query = query.eq('disposition', filters.disposition)
    }

    if (filters?.owner) {
      const o = filters.owner.replace(/%/g, '\\%')
      query = query.ilike('callback_owner_name', `%${o}%`)
    }

    if (filters?.dateFrom) {
      // expect ISO string (or yyyy-mm-dd); use created_at as reference
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      // include end of day if user passed a date without time
      query = query.lte('created_at', filters.dateTo)
    }

  const { data, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching callbacks paginated:', error)
      throw error
    }

    // Attach business_name from leads (matching by phone_number = callbacks.to_number)
    const callbacksData = data || []
    try {
      const toNumbers = Array.from(new Set(callbacksData.map((r: any) => r.to_number).filter(Boolean)))
      if (toNumbers.length > 0) {
        const { data: leadsRows } = await supabase
          .from('leads')
          .select('phone_number, business_name')
          .in('phone_number', toNumbers)

        const leadsByPhone: Record<string, any> = {}
        if (Array.isArray(leadsRows)) {
          for (const l of leadsRows) {
            if (l && l.phone_number) leadsByPhone[l.phone_number] = l
          }
        }

        for (const r of callbacksData) {
          const lead = leadsByPhone[r.to_number]
          if (lead && lead.business_name) r.business_name = lead.business_name
        }
      }
    } catch (e) {
      console.warn('Warning: no se pudo adjuntar business_name a callbacks desde leads:', e)
    }

    return {
      data: callbacksData,
      total: count || (callbacksData ? callbacksData.length : 0),
      page,
      limit,
      totalPages: Math.ceil((count || (callbacksData ? callbacksData.length : 0)) / limit)
    }
  } catch (err) {
    console.error('Error in getAllCallbacks:', err)
    throw err
  }
}

// Obtener llamadas (calls) con disposition = 'possibly_interested' que NO tengan callbacks asociados
export async function getPossiblyInterestedCallsWithoutCallbacks(page = 1, limit = 50, filters?: { search?: string, dateFrom?: string, dateTo?: string }) {
  try {
    const offset = (page - 1) * limit

    // 1) Obtener call_ids desde PCA con disposition = 'possibly_interested'
    const { data: pcaData, error: pcaErr } = await supabase
      .from('pca')
      .select('call_id')
      .eq('disposition', 'possibly_interested')

    if (pcaErr) {
      console.error('Error fetching PCA call_ids:', pcaErr)
      throw pcaErr
    }

    const pcaIds = Array.isArray(pcaData) ? Array.from(new Set(pcaData.map((r: any) => r.call_id).filter(Boolean))) : []

    if (pcaIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 }
    }

    // 2) Obtener call_ids que ya tienen callbacks
    const { data: cbIdsData, error: cbErr } = await supabase
      .from('callbacks')
      .select('call_id')

    if (cbErr) {
      console.error('Error fetching callback call_ids:', cbErr)
      throw cbErr
    }

    const cbIds = Array.isArray(cbIdsData) ? cbIdsData.map((r: any) => r.call_id).filter(Boolean) : []

    // 3) Filtrar pcaIds para excluir aquellos con callbacks
    const targetIds = pcaIds.filter((id: string) => !cbIds.includes(id))

    if (targetIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 }
    }

    // 4) Consultar calls cuya call_id esté en targetIds
    let query: any = supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .in('call_id', targetIds)
      .order('created_at', { ascending: false })

    if (filters?.search) {
      const s = filters.search.replace(/%/g, '\\%')
      query = query.or(`to_number.ilike.%${s}%,agent_name.ilike.%${s}%,business_name.ilike.%${s}%`)
    }

    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo)

    const { data, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching possibly_interested calls without callbacks:', error)
      throw error
    }

  // Adjuntar disposition desde PCA (última entrada por call_id) para mostrar en la UI
    const callsData = data || []

    try {
      const { data: pcaRows } = await supabase
        .from('pca')
        .select('call_id, disposition, created_at')
        .in('call_id', targetIds)
        .order('created_at', { ascending: false })

      const latestPcaByCall: Record<string, any> = {}
      if (Array.isArray(pcaRows)) {
        for (const row of pcaRows) {
          const cid = row.call_id
          if (!latestPcaByCall[cid]) {

    
            latestPcaByCall[cid] = row
          }
        }
      }

      // Attach disposition from PCA if present
      for (const c of callsData) {
        const p = latestPcaByCall[c.call_id]
        if (p && p.disposition) c.disposition = p.disposition
      }
    } catch (e) {
      // no fatal: seguimos devolviendo llamadas sin disposition desde PCA
      console.warn('Warning: no se pudo adjuntar PCA.disposition:', e)
    }

    // Adjuntar business_name desde tabla leads (matching via calls.to_number = leads.phone_number)
    try {
      const toNumbers = Array.from(new Set(callsData.map((c: any) => c.to_number).filter(Boolean)))
      if (toNumbers.length > 0) {
        const { data: leadsRows } = await supabase
          .from('leads')
          .select('phone_number, business_name')
          .in('phone_number', toNumbers)

        const leadsByPhone: Record<string, any> = {}
        if (Array.isArray(leadsRows)) {
          for (const l of leadsRows) {
            if (l && l.phone_number) leadsByPhone[l.phone_number] = l
          }
        }

        for (const c of callsData) {
          const lead = leadsByPhone[c.to_number]
          if (lead && lead.business_name) c.business_name = lead.business_name
        }
      }
    } catch (e) {
      console.warn('Warning: no se pudo adjuntar business_name desde leads:', e)
    }

    return {
      data: callsData,
      total: count || (callsData ? callsData.length : 0),
      page,
      limit,
      totalPages: Math.ceil((count || (callsData ? callsData.length : 0)) / limit)
    }
  } catch (err) {
    console.error('Error in getPossiblyInterestedCallsWithoutCallbacks:', err)
    throw err
  }
}

// Eliminar un callback por id
export async function deleteCallbackById(id: string) {
  try {
    const { data, error } = await supabase
      .from('callbacks')
      .delete()
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error deleting callback:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Error in deleteCallbackById:', err)
    throw err
  }
}

// Actualizar disposition (marcar completado u otros estados)
export async function updateCallbackDisposition(id: string, disposition: string) {
  try {
    const { data, error } = await supabase
      .from('callbacks')
      .update({ disposition })
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error updating callback disposition:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Error in updateCallbackDisposition:', err)
    throw err
  }
}

// Actualizar campos arbitrarios de un callback por id
export async function updateCallbackById(id: string, fields: Partial<Callback>) {
  try {
    const { data, error } = await supabase
      .from('callbacks')
      .update(fields)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error updating callback fields:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Error in updateCallbackById:', err)
    throw err
  }
}

// Crear un nuevo callback
export async function createCallback(fields: Partial<Callback>) {
  try {
    const { data, error } = await supabase
      .from('callbacks')
      .insert([fields])
      .select()

    if (error) {
      console.error('Error creating callback:', error)
      throw error
    }

    return Array.isArray(data) ? data[0] : data
  } catch (err) {
    console.error('Error in createCallback:', err)
    throw err
  }
}

// Función para obtener análisis PCA por call_id
export async function getPCAByCallId(callId: string): Promise<PCA[]> {
  try {
    const { data, error } = await supabase
      .from('pca')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PCA data:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getPCAByCallId:', error)
    throw error
  }
}

// Obtener la fila PCA más reciente para una call_id
export async function getLatestPcaByCallId(callId: string) {
  try {
    const { data, error } = await supabase
      .from('pca')
      // full row (useful for updates) — heavy; prefer getLatestPcaTranscriptByCallId for read-only transcript
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching latest PCA row:', error)
      throw error
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (err) {
    console.error('Error in getLatestPcaByCallId:', err)
    throw err
  }
}

// Helper ligero: obtener sólo los campos de transcript/recording de la PCA más reciente
export async function getLatestPcaTranscriptByCallId(callId: string) {
  try {
    const { data, error } = await supabase
      .from('pca')
      .select('id, call_id, transcript, recording_url, recording_multi_channel_url, created_at')
      .eq('call_id', callId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching latest PCA transcript row:', error)
      throw error
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch (err) {
    console.error('Error in getLatestPcaTranscriptByCallId:', err)
    throw err
  }
}

// Helper ligero: obtener solo campos básicos de la llamada (evitar joins/ilike costosos)
export async function getCallBasic(callId: string) {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('call_id, to_number, owner_name, agent_name, created_at, business_name')
      .eq('call_id', callId)
      .single()

    if (error) {
      console.error('Error fetching basic call data:', error)
      throw error
    }

    return data || null
  } catch (err) {
    console.error('Error in getCallBasic:', err)
    throw err
  }
}

// Enhanced lightweight call fetch: include lead owner_name (if exists) to support modal autocomplete
export async function getCallBasicWithLead(callId: string) {
  try {
    const callRow = await getCallBasic(callId)
    if (!callRow) return null

    // Try to fetch lead by to_number to pull lead.owner_name without doing heavy fuzzy searches
    try {
      const toNumber = String((callRow as any).to_number || '')
      if (toNumber) {
        const { data: leadRow, error: leadErr } = await supabase
          .from('leads')
          .select('owner_name')
          .eq('phone_number', toNumber)
          .limit(1)

        if (!leadErr && leadRow && Array.isArray(leadRow) && leadRow.length > 0) {
          ;(callRow as any).lead_owner_name = leadRow[0].owner_name || null
        } else {
          ;(callRow as any).lead_owner_name = null
        }
      } else {
        ;(callRow as any).lead_owner_name = null
      }
    } catch (e) {
      ;(callRow as any).lead_owner_name = null
    }

    return callRow
  } catch (err) {
    console.error('Error in getCallBasicWithLead:', err)
    throw err
  }
}

// Actualizar campos de una fila PCA por id
export async function updatePcaById(id: string, fields: Partial<PCA>) {
  try {
    const { data, error } = await supabase
      .from('pca')
      .update(fields)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error updating PCA row:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Error in updatePcaById:', err)
    throw err
  }
}

// Nueva función para obtener información completa del cliente y análisis (calls y callbacks)
export async function getCallDetailsWithPCA(callId: string): Promise<{ call: Call | null, pca: PCA[], isCallback: boolean, callback?: any }> {
  try {
    console.log('🔍 getCallDetailsWithPCA - buscando callId:', callId)
    
    // Obtener la llamada (siempre existe)
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('call_id', callId)
      .single()

    console.log('📞 Resultado búsqueda en calls:', { callData, callError })

    if (callError || !callData) {
      console.error('❌ No se encontró la call con ID:', callId)
      return {
        call: null,
        pca: [],
        isCallback: false
      }
    }

    // Verificar si esta call tiene un callback asociado
    const { data: callbackData, error: callbackError } = await supabase
      .from('callbacks')
      .select('*')
      .eq('call_id', callId)
      .single()

    console.log('� Verificando si tiene callback asociado:', { callbackData, callbackError })

    // Obtener PCA
    const pcaData = await getPCAByCallId(callId)

    // Intentar enriquecer los datos del cliente desde la tabla `leads` usando el número destino
    try {
      if (callData && callData.to_number) {
        const rawNumber = String(callData.to_number || '')
        const digitsOnly = rawNumber.replace(/\D/g, '')

        // Debug: always log raw and digits for the example callId so we can see the normalized form
        if (callId === 'call_878bbde354fbfac2e516ec5ea56') {
          console.log('🔍 [DEBUG] call rawNumber/digitsOnly ->', { rawNumber, digitsOnly })
        }

        // 1) Intentar match exacto primero
        let leadRow: any = null
        let leadErr: any = null

        const exactMatch = await supabase
          .from('leads')
          .select('phone_number, business_name, owner_name, location_type, address_street, address_city, address_state, address_zip, business_hours, other_locations, agreed_amount, owner_phone')
          .eq('phone_number', rawNumber)
          .limit(1)

         if (exactMatch.error) {
          // no fatal, lo guardamos
          leadErr = exactMatch.error
        } else if (exactMatch.data && exactMatch.data.length > 0) {
          leadRow = exactMatch.data[0]
        }

        if (callId === 'call_878bbde354fbfac2e516ec5ea56') {
          console.log('🔍 [DEBUG] exactMatch result:', { error: exactMatch.error, count: exactMatch.data?.length })
        }

        // 2) Si no encontramos por exacto, intentar buscar por sufijo de 8-10 dígitos
        if (!leadRow && digitsOnly.length >= 6) {
          const last10 = digitsOnly.slice(-10)
          // Usamos ilike para buscar cualquier formato que contenga los últimos dígitos
          const { data: fuzzyData, error: fuzzyErr } = await supabase
            .from('leads')
            .select('phone_number, business_name, owner_name, location_type, address_street, address_city, address_state, address_zip, business_hours, other_locations, agreed_amount, owner_phone')
            .ilike('phone_number', `%${last10}`)
            .limit(1)

          if (fuzzyErr) {
            leadErr = fuzzyErr
          } else if (fuzzyData && fuzzyData.length > 0) {
            leadRow = fuzzyData[0]
          }

          if (callId === 'call_878bbde354fbfac2e516ec5ea56') {
            console.log('🔍 [DEBUG] fuzzyMatch result:', { fuzzyErr, fuzzyCount: fuzzyData?.length, last10 })
          }
        }

        // 3) Si aún no encontramos, probar variantes adicionales: quitar prefijo '1' y sufijos más cortos
        if (!leadRow) {
          const attempts: Array<{desc: string; pattern: string}> = []
          // si empieza con '1' y es más largo a 10, probar sin prefijo
          if (digitsOnly.startsWith('1') && digitsOnly.length > 10) {
            const without1 = digitsOnly.slice(1)
            attempts.push({ desc: 'without1_exact', pattern: without1 })
            attempts.push({ desc: 'without1_last10', pattern: without1.slice(-10) })
          }
          // sufijos de 8,7,6
          const suffixes = [8,7,6]
          for (const s of suffixes) {
            if (digitsOnly.length >= s) {
              attempts.push({ desc: `last${s}`, pattern: digitsOnly.slice(-s) })
            }
          }

          for (const att of attempts) {
            try {
              const pat = att.pattern
              if (!pat) continue
              // probar exacto si longitud coincide (ej: without1_exact)
              if (att.desc.includes('exact') && pat.length >= 6) {
                const { data: exData, error: exErr } = await supabase
                  .from('leads')
                  .select('phone_number, business_name, owner_name, location_type, address_street, address_city, address_state, address_zip, business_hours, other_locations, agreed_amount, owner_phone')
                  .eq('phone_number', pat)
                  .limit(1)

                if (!exErr && exData && exData.length > 0) {
                  leadRow = exData[0]
                  if (callId === 'call_878bbde354fbfac2e516ec5ea56') console.log('🔍 [DEBUG] found lead by', att.desc, pat)
                  break
                }
              }

              // probar ilike por sufijo
              const { data: sData, error: sErr } = await supabase
                .from('leads')
                .select('phone_number, business_name, owner_name, location_type, address_street, address_city, address_state, address_zip, business_hours, other_locations, agreed_amount, owner_phone')
                .ilike('phone_number', `%${pat}`)
                .limit(1)

              if (!sErr && sData && sData.length > 0) {
                leadRow = sData[0]
                if (callId === 'call_878bbde354fbfac2e516ec5ea56') console.log('🔍 [DEBUG] found lead by ilike', att.desc, pat)
                break
              }
            } catch (e) {
              if (callId === 'call_878bbde354fbfac2e516ec5ea56') console.warn('🔍 [DEBUG] extra attempt error', e)
            }
          }
          if (callId === 'call_878bbde354fbfac2e516ec5ea56' && !leadRow) {
            console.log('🔍 [DEBUG] no leadRow found after extra attempts for', digitsOnly)
          }
        }

        if (!leadErr && leadRow) {
          if (callId === 'call_878bbde354fbfac2e516ec5ea56') {
            console.log('🔎 [DEBUG] matched leadRow for callId', callId, { rawNumber, digitsOnly, leadRow })
          }
          // Preferir los valores de leads cuando existan
          callData.business_name = callData.business_name || leadRow.business_name
          callData.owner_name = callData.owner_name || leadRow.owner_name
          callData.owner_email = callData.owner_email || leadRow.owner_email
          callData.location_type = callData.location_type || leadRow.location_type
          callData.address_street = callData.address_street || leadRow.address_street
          callData.address_city = callData.address_city || leadRow.address_city
          callData.address_state = callData.address_state || leadRow.address_state
          callData.address_zip = callData.address_zip || leadRow.address_zip
          callData.business_hours = callData.business_hours || leadRow.business_hours
          callData.other_locations = callData.other_locations || leadRow.other_locations
          callData.agreed_amount = callData.agreed_amount || leadRow.agreed_amount
          callData.owner_phone = callData.owner_phone || leadRow.owner_phone || leadRow.phone_number
          // Also keep the raw lead phone for explicit use in the UI
          ;(callData as any).lead_phone = leadRow.phone_number || null
          // Also keep lead business name explicitly for UI priority
          ;(callData as any).lead_business_name = leadRow.business_name || null
          // Keep the raw lead owner name separately so the UI can prefer lead values explicitly
          ;(callData as any).lead_owner_name = leadRow.owner_name || null
        } else if (leadErr) {
          console.warn('Warning fetching leads for callDetails:', leadErr)
        }
      }
    } catch (err) {
      console.warn('Warning: could not enrich callData with leads:', err)
    }

    if (callbackData && !callbackError) {
      // Es una call que TAMBIÉN es un callback
      console.log('✅ Call con callback asociado encontrado')
      return {
        call: callData,
        pca: pcaData,
        isCallback: true,
        callback: callbackData
      }
    } else {
      // Es una call normal (sin callback)
      console.log('✅ Call normal (sin callback)')
      return {
        call: callData,
        pca: pcaData,
        isCallback: false
      }
    }
  } catch (error) {
    console.error('❌ Error in getCallDetailsWithPCA:', error)
    throw error
  }
}

// Función de debug para ver todos los PCA disponibles
export async function getAllPCA() {
  console.log('Intentando obtener todos los PCA...')
  
  // Primero intentamos sin límites
  const { data, error, status, statusText } = await supabase
    .from('pca')
    .select('id, call_id, agent_name, created_at')
    .order('created_at', { ascending: false })

  console.log('Respuesta PCA:', { 
    data, 
    error, 
    status, 
    statusText,
    dataLength: data?.length || 0
  })

  if (error) {
    console.error('Error detallado al obtener PCA:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    // Intentamos con un query más simple
    console.log('Intentando query más simple...')
    const { data: simpleData, error: simpleError } = await supabase
      .from('pca')
      .select('*')
      .limit(1)
    
    console.log('Query simple resultado:', { simpleData, simpleError })
    
    throw error
  }

  console.log('PCA obtenidos exitosamente:', data)
  return data
}

// Función de debug simple para verificar acceso a PCA
export async function testPCAAccess() {
  console.log('Testeando acceso a tabla PCA...')
  
  const { data, error, count } = await supabase
    .from('pca')
    .select('*', { count: 'exact', head: true })

  console.log('Test PCA - Count:', count, 'Error:', error)
  
  return { count, error }
}

// Función para verificar todas las tablas disponibles
export async function testAllTablesAccess() {
  const tables = ['calls', 'pca', 'callbacks']
  const results: Record<string, { count: number | null, error: string | null }> = {}
  
  for (const table of tables) {
    try {
      console.log(`Testeando tabla: ${table}`)
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      results[table] = { count, error: error?.message || null }
      console.log(`${table}: ${count} registros, error:`, error?.message)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      results[table] = { count: 0, error: errorMessage }
      console.error(`Error en tabla ${table}:`, err)
    }
  }
  
  return results
}

// Función específica para diagnosticar el problema de PCA
export async function diagnosePCAAccess() {
  console.log('🔍 Diagnosticando acceso a tabla PCA...')
  
  const tests = []
  
  // Test 1: Count básico
  try {
    const { count, error } = await supabase
      .from('pca')
      .select('*', { count: 'exact', head: true })
    
    tests.push({
      test: 'Count básico',
      success: !error,
      result: `Count: ${count}`,
      error: error?.message
    })
  } catch (err) {
    tests.push({
      test: 'Count básico',
      success: false,
      result: 'Excepción',
      error: err instanceof Error ? err.message : 'Error desconocido'
    })
  }
  
  // Test 2: Select simple con límite
  try {
    const { data, error } = await supabase
      .from('pca')
      .select('id')
      .limit(1)
    
    tests.push({
      test: 'Select simple (limit 1)',
      success: !error,
      result: `Registros: ${data?.length || 0}`,
      error: error?.message
    })
  } catch (err) {
    tests.push({
      test: 'Select simple (limit 1)',
      success: false,
      result: 'Excepción',
      error: err instanceof Error ? err.message : 'Error desconocido'
    })
  }
  
  // Test 3: Select específico
  try {
    const { data, error } = await supabase
      .from('pca')
      .select('id, call_id')
      .limit(3)
    
    tests.push({
      test: 'Select específico (id, call_id)',
      success: !error,
      result: `Registros: ${data?.length || 0}`,
      error: error?.message,
      sampleData: data
    })
  } catch (err) {
    tests.push({
      test: 'Select específico (id, call_id)',
      success: false,
      result: 'Excepción',
      error: err instanceof Error ? err.message : 'Error desconocido'
    })
  }
  
  // Test 4: Verificar si RLS está causando el problema
  try {
    // Intentamos hacer un query con bypass de RLS si es posible
    const { data, error } = await supabase
      .rpc('get_pca_count')  // Esta función no existe, pero el error nos dará información
    
    tests.push({
      test: 'Test RPC (para verificar RLS)',
      success: !error,
      result: 'RPC call',
      error: error?.message
    })
  } catch (err) {
    tests.push({
      test: 'Test RPC (para verificar RLS)',
      success: false,
      result: 'RPC no disponible',
      error: err instanceof Error ? err.message : 'Error desconocido'
    })
  }

  console.log('📊 Resultados del diagnóstico:', tests)
  return tests
}

// Función para crear una política temporal de RLS
export async function createPCAPolicy() {
  console.log('🔧 Intentando crear política de acceso para PCA...')
  
  try {
    // Intentamos ejecutar un comando SQL para crear una política
    const { data, error } = await supabase
      .rpc('create_pca_policy')
    
    return { success: !error, error: error?.message }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Error desconocido'
    }
  }
}

// 📞 FUNCIONES PARA HISTORIAL DE LLAMADAS POR TELÉFONO

// Interfaz para un Lead (número de teléfono con información del cliente)
export interface Lead {
  phone_number: string
  business_name?: string
  owner_name?: string
  owner_email?: string
  location_type?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  total_calls: number
  last_call_date: string
  last_disposition?: string
  agreed_amount?: number
}

// Función para obtener todos los leads (números únicos con su información más reciente)
export async function getLeads(): Promise<Lead[]> {
  console.log('📞 Obteniendo todos los leads (optimizado)...')
  
  try {
    // Consulta optimizada: solo campos necesarios de calls
    const { data: callsData, error: callsError } = await supabase
      .from('calls')
      .select(`
        call_id,
        to_number,
        business_name,
        owner_name,
        owner_email,
        location_type,
        address_street,
        address_city,
        address_state,
        address_zip,
        disposition,
        agreed_amount
      `)
      .not('to_number', 'is', null)
      .order('call_id', { ascending: false })
      .limit(1000) // Límite para evitar consultas masivas
    
    if (callsError) {
      console.error('❌ Error obteniendo calls:', callsError)
      throw callsError
    }

    // Consulta optimizada para PCA - solo disposition
    const { data: pcaData, error: pcaError } = await supabase
      .from('pca')
      .select('call_id, disposition')
      .not('disposition', 'is', null)

    if (pcaError) {
      console.error('❌ Error obteniendo pca:', pcaError)
      // No lanzamos error, continuamos sin pca
    }

    // Consulta optimizada para callbacks - solo campos necesarios
    const { data: callbacksData, error: callbacksError } = await supabase
      .from('callbacks')
      .select('to_number, disposition, created_at')
      .not('to_number', 'is', null)
      .not('disposition', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500) // Límite para callbacks

    if (callbacksError) {
      console.error('❌ Error obteniendo callbacks:', callbacksError)
      // No lanzamos error, continuamos sin callbacks
    }

    if (!callsData) return []

    // Crear mapa de PCA por call_id
    const pcaMap = new Map()
    if (pcaData) {
      pcaData.forEach(pca => {
        pcaMap.set(pca.call_id, pca)
      })
    }

    // Crear mapa de callbacks por teléfono (solo el más reciente por número)
    const callbacksMap = new Map()
    if (callbacksData) {
      callbacksData.forEach(callback => {
        if (!callbacksMap.has(callback.to_number)) {
          callbacksMap.set(callback.to_number, callback)
        }
      })
    }

    // Agrupamos por to_number de forma más eficiente
    const leadsMap = new Map<string, Lead>()
    
    for (const call of callsData) {
      if (!call.to_number) continue
      
      // Disposition con prioridad: pca > calls > callback
      const pcaInfo = pcaMap.get(call.call_id)
      const disposition = pcaInfo?.disposition || call.disposition
      
      const existingLead = leadsMap.get(call.to_number)
      
      if (!existingLead) {
        // Primera vez que vemos este número
        const callback = callbacksMap.get(call.to_number)
        
        leadsMap.set(call.to_number, {
          phone_number: call.to_number,
          business_name: call.business_name,
          owner_name: call.owner_name,
          owner_email: call.owner_email,
          location_type: call.location_type,
          address_street: call.address_street,
          address_city: call.address_city,
          address_state: call.address_state,
          address_zip: call.address_zip,
          total_calls: 1,
          last_call_date: call.call_id,
          last_disposition: disposition || callback?.disposition || null,
          agreed_amount: call.agreed_amount
        })
      } else {
        // Actualizamos el conteo
        existingLead.total_calls++
        
        // Si esta llamada es más reciente (call_id mayor), actualizamos
        if (call.call_id > existingLead.last_call_date) {
          existingLead.business_name = call.business_name || existingLead.business_name
          existingLead.owner_name = call.owner_name || existingLead.owner_name
          existingLead.owner_email = call.owner_email || existingLead.owner_email
          existingLead.location_type = call.location_type || existingLead.location_type
          existingLead.address_street = call.address_street || existingLead.address_street
          existingLead.address_city = call.address_city || existingLead.address_city
          existingLead.address_state = call.address_state || existingLead.address_state
          existingLead.address_zip = call.address_zip || existingLead.address_zip
          existingLead.last_call_date = call.call_id
          existingLead.last_disposition = disposition || existingLead.last_disposition
          existingLead.agreed_amount = call.agreed_amount || existingLead.agreed_amount
        }
      }
    }

    // Post-procesamiento: aplicar callbacks solo si no hay disposition válido
    callbacksMap.forEach((callback, phoneNumber) => {
      const lead = leadsMap.get(phoneNumber)
      if (lead && (!lead.last_disposition || lead.last_disposition === 'Sin disposition')) {
        lead.last_disposition = callback.disposition
        console.log(`📋 Aplicando callback disposition: ${phoneNumber} → ${callback.disposition}`)
      }
    })

    const leads = Array.from(leadsMap.values())
    console.log(`✅ Encontrados ${leads.length} leads únicos (optimizado)`)
    return leads
    
  } catch (error) {
    console.error('❌ Error en getLeads optimizado:', error)
    throw error
  }
}

// Interfaz para filtros de leads con paginación
export interface LeadFilters {
  search?: string
  disposition?: string
  minCalls?: number
  hasAgreedAmount?: 'all' | 'yes' | 'no'
}

// Interfaz para parámetros de paginación de leads
export interface LeadPaginationParams {
  page: number
  limit: number
  search?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters?: LeadFilters
}

// Resultado paginado de leads
export interface PaginatedLeadsResult {
  leads: Lead[]
  totalCount: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Función optimizada para obtener leads con paginación del lado del servidor
export async function getLeadsWithPagination(params: LeadPaginationParams): Promise<PaginatedLeadsResult> {
  console.log('📞 Obteniendo leads con paginación del servidor...', params)
  
  try {
    // Construcción de la consulta base para calls
    let callsQuery = supabase
      .from('calls')
      .select(`
        call_id,
        to_number,
        business_name,
        owner_name,
        owner_email,
        location_type,
        address_street,
        address_city,
        address_state,
        address_zip,
        disposition,
        agreed_amount
      `, { count: 'exact' })
      .not('to_number', 'is', null)

    // Aplicar filtros de búsqueda
    if (params.search) {
      const searchTerm = `%${params.search}%`
      callsQuery = callsQuery.or(
        `business_name.ilike.${searchTerm},` +
        `owner_name.ilike.${searchTerm},` +
        `to_number.ilike.${searchTerm},` +
        `owner_email.ilike.${searchTerm},` +
        `address_street.ilike.${searchTerm},` +
        `address_city.ilike.${searchTerm},` +
        `address_state.ilike.${searchTerm}`
      )
    }

    // Aplicar ordenamiento (siempre por call_id para agrupar por teléfono después)
    callsQuery = callsQuery.order('call_id', { ascending: false })

    // Obtener más datos para permitir agrupación
    const limitMultiplier = 3 // Obtener 3x más datos para agrupar por teléfono
    const { data: callsData, error: callsError, count: totalCallsCount } = await callsQuery
      .limit(params.limit * limitMultiplier * params.page) // Obtener suficientes datos

    if (callsError) {
      console.error('❌ Error obteniendo calls:', callsError)
      throw callsError
    }

    // Obtener PCA y callbacks como antes
    const { data: pcaData } = await supabase
      .from('pca')
      .select('call_id, disposition')
      .not('disposition', 'is', null)

    const { data: callbacksData } = await supabase
      .from('callbacks')
      .select('to_number, disposition, created_at')
      .not('to_number', 'is', null)
      .not('disposition', 'is', null)
      .order('created_at', { ascending: false })

    if (!callsData) {
      return {
        leads: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: params.page,
        hasNextPage: false,
        hasPreviousPage: false
      }
    }

    // Crear mapas como en la función original
    const pcaMap = new Map()
    if (pcaData) {
      pcaData.forEach(pca => pcaMap.set(pca.call_id, pca))
    }

    const callbacksMap = new Map()
    if (callbacksData) {
      callbacksData.forEach(callback => {
        if (!callbacksMap.has(callback.to_number)) {
          callbacksMap.set(callback.to_number, callback)
        }
      })
    }

    // Agrupar por teléfono (igual que la función original)
    const leadsMap = new Map<string, Lead>()
    
    for (const call of callsData) {
      if (!call.to_number) continue
      
      const pcaInfo = pcaMap.get(call.call_id)
      const disposition = pcaInfo?.disposition || call.disposition
      
      const existingLead = leadsMap.get(call.to_number)
      
      if (!existingLead) {
        const callback = callbacksMap.get(call.to_number)
        
        leadsMap.set(call.to_number, {
          phone_number: call.to_number,
          business_name: call.business_name,
          owner_name: call.owner_name,
          owner_email: call.owner_email,
          location_type: call.location_type,
          address_street: call.address_street,
          address_city: call.address_city,
          address_state: call.address_state,
          address_zip: call.address_zip,
          total_calls: 1,
          last_call_date: call.call_id,
          last_disposition: disposition || callback?.disposition || null,
          agreed_amount: call.agreed_amount
        })
      } else {
        existingLead.total_calls++
        
        if (call.call_id > existingLead.last_call_date) {
          existingLead.business_name = call.business_name || existingLead.business_name
          existingLead.owner_name = call.owner_name || existingLead.owner_name
          existingLead.owner_email = call.owner_email || existingLead.owner_email
          existingLead.location_type = call.location_type || existingLead.location_type
          existingLead.address_street = call.address_street || existingLead.address_street
          existingLead.address_city = call.address_city || existingLead.address_city
          existingLead.address_state = call.address_state || existingLead.address_state
          existingLead.address_zip = call.address_zip || existingLead.address_zip
          existingLead.last_call_date = call.call_id
          existingLead.last_disposition = disposition || existingLead.last_disposition
          existingLead.agreed_amount = call.agreed_amount || existingLead.agreed_amount
        }
      }
    }

    // Aplicar callbacks
    callbacksMap.forEach((callback, phoneNumber) => {
      const lead = leadsMap.get(phoneNumber)
      if (lead && (!lead.last_disposition || lead.last_disposition === 'Sin disposition')) {
        lead.last_disposition = callback.disposition
      }
    })

    let allLeads = Array.from(leadsMap.values())

    // Aplicar filtros del lado del servidor
    const filters = params.filters
    if (filters) {
      if (filters.disposition && filters.disposition !== 'all') {
        allLeads = allLeads.filter(lead => lead.last_disposition === filters.disposition)
      }

      if (filters.minCalls && filters.minCalls > 1) {
        allLeads = allLeads.filter(lead => lead.total_calls >= (filters.minCalls || 1))
      }

      if (filters.hasAgreedAmount === 'yes') {
        allLeads = allLeads.filter(lead => lead.agreed_amount && lead.agreed_amount > 0)
      } else if (filters.hasAgreedAmount === 'no') {
        allLeads = allLeads.filter(lead => !lead.agreed_amount || lead.agreed_amount <= 0)
      }
    }

    // Aplicar ordenamiento
    allLeads.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (params.sortBy) {
        case 'business_name':
          aValue = a.business_name || ''
          bValue = b.business_name || ''
          break
        case 'owner_name':
          aValue = a.owner_name || ''
          bValue = b.owner_name || ''
          break
        case 'total_calls':
          aValue = a.total_calls
          bValue = b.total_calls
          break
        case 'agreed_amount':
          aValue = a.agreed_amount || 0
          bValue = b.agreed_amount || 0
          break
        case 'last_call_date':
        default:
          aValue = a.last_call_date || ''
          bValue = b.last_call_date || ''
          break
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return params.sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = aValue - bValue
        return params.sortOrder === 'asc' ? comparison : -comparison
      }
    })

    // Aplicar paginación
    const totalCount = allLeads.length
    const totalPages = Math.ceil(totalCount / params.limit)
    const startIndex = (params.page - 1) * params.limit
    const paginatedLeads = allLeads.slice(startIndex, startIndex + params.limit)

    console.log(`✅ Encontrados ${paginatedLeads.length} leads de ${totalCount} totales (página ${params.page}/${totalPages})`)

    return {
      leads: paginatedLeads,
      totalCount,
      totalPages,
      currentPage: params.page,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1
    }
    
  } catch (error) {
    console.error('❌ Error en getLeadsWithPagination:', error)
    throw error
  }
}// Interfaz para interacciones combinadas (calls + callbacks)
export interface CallInteraction {
  type: 'call' | 'callback'
  call_id?: string
  id?: string
  disposition?: string
  business_name?: string
  owner_name?: string
  agreed_amount?: number
  address_street?: string
  address_city?: string
  address_state?: string
  callback_time?: string
  call_successful?: boolean
  duration_ms?: number | null
  disconnection_reason?: string | null
  created_at?: string
  date: string
  display_date: string
  hasCallback?: boolean
}

// Función para obtener historial completo (calls + callbacks) por número de teléfono
export async function getCallHistoryByPhone(phoneNumber: string): Promise<CallInteraction[]> {
  console.log(`📞 Obteniendo historial completo para: ${phoneNumber}`)
  
  try {
    // Obtener llamadas regulares
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('to_number', phoneNumber)
      .order('call_id', { ascending: false })
    
    if (callsError) {
      console.error('❌ Error obteniendo llamadas:', callsError)
      throw callsError
    }
    
    console.log(`📞 Encontradas ${calls?.length || 0} llamadas para ${phoneNumber}`)
    
    // Obtener callbacks para ese número
    const { data: callbacks, error: callbacksError } = await supabase
      .from('callbacks')
      .select('*')
      .eq('to_number', phoneNumber)
      .order('created_at', { ascending: false })
    
    console.log(`🔄 Encontrados ${callbacks?.length || 0} callbacks para ${phoneNumber}`)
    
    if (callbacksError) {
      console.error('❌ Error obteniendo callbacks:', callbacksError)
      // No lanzamos error, solo logueamos
    }
    
    // Obtener dispositions del PCA para las calls
  let pcaMap = new Map()
  let pcaSuccessMap = new Map()
  let pcaDurationMap = new Map<string, number | null>()
  let pcaDisconnectionMap = new Map<string, string | null>()
    let callbackMap = new Map()
    
    if (calls && calls.length > 0) {
      const callIds = calls.map(call => call.call_id)
      
      // Obtener dispositions, duración y razón de desconexión del PCA
      const { data: pcaData } = await supabase
        .from('pca')
        .select('call_id, disposition, call_successful, duration_ms, disconnection_reason')
        .in('call_id', callIds)

      if (pcaData) {
        pcaData.forEach(pca => {
          pcaMap.set(pca.call_id, pca.disposition)
          pcaSuccessMap.set(pca.call_id, pca.call_successful)
          pcaDurationMap.set(pca.call_id, typeof pca.duration_ms !== 'undefined' ? pca.duration_ms : null)
          pcaDisconnectionMap.set(pca.call_id, typeof pca.disconnection_reason !== 'undefined' ? pca.disconnection_reason : null)
        })
      }
      
      // Obtener callbacks asociados a estas calls
      const { data: associatedCallbacks } = await supabase
        .from('callbacks')
        .select('*')
        .in('call_id', callIds)
      
      if (associatedCallbacks) {
        associatedCallbacks.forEach(callback => {
          if (callback.call_id) {
            callbackMap.set(callback.call_id, callback)
          } else {
            console.log(`⚠️ Callback ${callback.id} no tiene call_id`)
          }
        })
      }
      
      console.log(`🔗 Calls con callbacks asociados: ${Array.from(callbackMap.keys()).join(', ')}`)
      console.log(`📋 Todos los call_ids de calls: ${(calls || []).map(c => c.call_id).join(', ')}`)
      console.log(`📋 Todos los call_ids de callbacks: ${(callbacks || []).map(c => c.call_id).join(', ')}`)
    }
    
    // Combinar y marcar el tipo - SIN DUPLICAR
    const allInteractions: CallInteraction[] = [
      // Procesar todas las calls e indicar si tienen callback asociado
      ...(calls || []).map(call => {
        const hasCallback = callbackMap.has(call.call_id)
  const pcaDisposition = pcaMap.get(call.call_id) || call.disposition
  const callSuccessful = pcaSuccessMap.has(call.call_id) ? pcaSuccessMap.get(call.call_id) : call.call_successful
  // Intentar obtener duration_ms desde PCA si está disponible
  const pcaDuration = pcaDurationMap.has(call.call_id) ? pcaDurationMap.get(call.call_id) : undefined
  const pcaDisconnection = pcaDisconnectionMap.has(call.call_id) ? pcaDisconnectionMap.get(call.call_id) : undefined

        // Use created_at as the canonical date when available to avoid duplication and allow proper sorting
        const canonicalDate = call.created_at || call.call_id || ''
        const displayDate = call.created_at || call.call_id || ''

        const result = {
          ...call,
          type: 'call' as const,
          date: canonicalDate,
          display_date: displayDate,
          disposition: pcaDisposition,
          call_successful: callSuccessful,
          duration_ms: typeof pcaDuration !== 'undefined' ? pcaDuration : call.duration_ms,
          disconnection_reason: typeof pcaDisconnection !== 'undefined' ? pcaDisconnection : call.disconnection_reason,
          hasCallback
        }

        console.log(`📞 Call ${call.call_id}: disposition="${pcaDisposition}", call_successful=${callSuccessful}, hasCallback=${hasCallback}, date=${canonicalDate}`)

        return result
      }),
      
      // Procesar TODOS los callbacks (incluye los que tienen call asociada y los independientes)
      ...((callbacks || []).filter(callback => {
        // Si el callback está asociado a una call (misma call_id), NO incluirlo como entrada separada.
        // En su lugar la llamada ya se muestra y está marcada con hasCallback.
        const associatedCall = calls?.find(call => call.call_id === callback.call_id)
        if (associatedCall) {
          console.log(`Omitiendo callback ${callback.id || callback.call_id} porque existe call asociada ${associatedCall.call_id}`)
          return false
        }
        return true
      }).map(callback => {
        const associatedCall = calls?.find(call => call.call_id === callback.call_id)
  const pcaDisposition = associatedCall ? (pcaMap.get(callback.call_id) || associatedCall.disposition) : callback.disposition
  const callSuccessful = associatedCall ? (pcaSuccessMap.has(callback.call_id) ? pcaSuccessMap.get(callback.call_id) : associatedCall.call_successful) : undefined
  const pcaDisconnection = associatedCall ? (pcaDisconnectionMap.get(callback.call_id) || associatedCall.disconnection_reason) : callback.disconnection_reason

        const result = {
          ...callback,
          type: 'callback' as const,
          date: callback.created_at || callback.id,
          display_date: callback.callback_time || callback.created_at || callback.id,
          ...(associatedCall ? {
            business_name: associatedCall.business_name,
            owner_name: callback.callback_owner_name || associatedCall.owner_name,
            address_street: associatedCall.address_street,
            address_city: associatedCall.address_city,
            address_state: associatedCall.address_state,
            owner_phone: associatedCall.owner_phone,
            agreed_amount: associatedCall.agreed_amount,
            disposition: pcaDisposition,
            call_successful: callSuccessful,
            disconnection_reason: pcaDisconnection
          } : {
            business_name: callback.business_name,
            owner_name: callback.callback_owner_name,
            agreed_amount: undefined,
            disposition: callback.disposition,
            disconnection_reason: callback.disconnection_reason
          }),
          callback_time: callback.callback_time,
          callback_owner_name: callback.callback_owner_name
        }

        console.log(`🔄 Callback ${callback.id || callback.call_id}: ${associatedCall ? 'con call asociada' : 'independiente'}, owner="${callback.callback_owner_name}", call_successful=${callSuccessful}`)

        return result
      }))
    ]
    
    // Ordenar por fecha (más antiguos primero). Intentamos parsear ISO dates cuando sea posible.
    allInteractions.sort((a, b) => {
      const ta = Date.parse(a.date || '')
      const tb = Date.parse(b.date || '')
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
        return ta < tb ? -1 : (ta > tb ? 1 : 0)
      }
      // Fallback a comparación lexicográfica (ascendente)
      const da = a.date || ''
      const db = b.date || ''
      if (da < db) return -1
      if (da > db) return 1
      return 0
    })
    
    console.log(`✅ Procesadas ${calls?.length || 0} llamadas (${(calls || []).filter(call => !callbackMap.has(call.call_id)).length} calls + ${callbacks?.length || 0} callbacks) para ${phoneNumber}`)
    return allInteractions
    
  } catch (error) {
    console.error('❌ Error obteniendo historial completo:', error)
    throw error
  }
}

// Función para contar cuántas llamadas tiene un número
export async function getCallCountByPhone(phoneNumber: string): Promise<number> {
  const { count, error } = await supabase
    .from('calls')
    .select('call_id', { count: 'exact', head: true })
    .eq('to_number', phoneNumber)
  
  if (error) {
    console.error('❌ Error contando llamadas:', error)
    return 0
  }
  
  return count || 0
}

// Función para verificar si una llamada tiene historial
export async function hasCallHistory(callId: string): Promise<{ hasHistory: boolean; count: number; phoneNumber?: string }> {
  // Primero obtenemos el to_number de la llamada actual
  const { data: callData, error: callError } = await supabase
    .from('calls')
    .select('to_number')
    .eq('call_id', callId)
    .single()
  
  if (callError || !callData?.to_number) {
    return { hasHistory: false, count: 0 }
  }
  
  const phoneNumber = callData.to_number
  const count = await getCallCountByPhone(phoneNumber)
  
  return { 
    hasHistory: count > 1, 
    count,
    phoneNumber 
  }
}