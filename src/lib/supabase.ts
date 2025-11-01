
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
  callback_owner_name: string
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
    
    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })

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

    // Determinar si necesitamos aplicar filtros post-query
    
    // Si necesitamos filtros post-query, obtener TODOS los registros primero
    if (needsPostQueryFiltering) {
      // No aplicar paginación aún, la aplicaremos después del filtrado
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
  .select('call_id, disposition, duration_ms')
  .in('call_id', callIds)
    const pcaDurationMap = new Map(
      (pcaData || []).map(pca => [pca.call_id, pca.duration_ms])
    );

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
    const pcaDispositionMap = new Map(
      (pcaData || []).map(pca => [pca.call_id, pca.disposition])
    )
    
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
      
      return {
        ...call,
        owner_name: callbackOwnerName || call.owner_name,
        owner_phone: callbackOwnerPhone || call.owner_phone,
        disposition: pcaDisposition || call.disposition,
        hasPCA: callsWithPCA.has(call.call_id),
        hasCallbacks: callbackOwnerNameMap.has(call.call_id),
        duration_ms: pcaDurationMap.get(call.call_id) || null
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
    const finalTotal = filteredCalls.length
    
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
      .order('callback_date', { ascending: false })

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
    let callbackMap = new Map()
    
    if (calls && calls.length > 0) {
      const callIds = calls.map(call => call.call_id)
      
      // Obtener dispositions y duración del PCA
      const { data: pcaData } = await supabase
        .from('pca')
        .select('call_id, disposition, call_successful, duration_ms')
        .in('call_id', callIds)
      
      if (pcaData) {
        pcaData.forEach(pca => {
          pcaMap.set(pca.call_id, pca.disposition)
          pcaSuccessMap.set(pca.call_id, pca.call_successful)
          // Guardar duración si existe
          if (typeof pca.duration_ms !== 'undefined') {
            pcaMap.set(`${pca.call_id}::duration_ms`, pca.duration_ms)
          }
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
        const pcaDuration = pcaMap.has(`${call.call_id}::duration_ms`) ? pcaMap.get(`${call.call_id}::duration_ms`) : undefined

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
            call_successful: callSuccessful
          } : {
            business_name: callback.business_name,
            owner_name: callback.callback_owner_name,
            agreed_amount: undefined,
            disposition: callback.disposition
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