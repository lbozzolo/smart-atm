'use client'

import { useEffect, useState } from 'react'
import { getCallsWithPCAInfo, getAllPCA, testPCAAccess, testAllTablesAccess, diagnosePCAAccess, type CallWithPCAInfo } from '@/lib/supabase'

export default function DebugData() {
  const [calls, setCalls] = useState<CallWithPCAInfo[]>([])
  const [pcaData, setPcaData] = useState<any[]>([])
  const [pcaTest, setPcaTest] = useState<any>(null)
  const [allTablesTest, setAllTablesTest] = useState<any>(null)
  const [pcaDiagnosis, setPcaDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Ejecutamos los tests básicos primero
        const [callsData, allTablesResult] = await Promise.all([
          getCallsWithPCAInfo(),
          testAllTablesAccess()
        ])
        
        setCalls(callsData)
        setAllTablesTest(allTablesResult)
        
        // Luego ejecutamos el diagnóstico específico para PCA
        const diagnosisResult = await diagnosePCAAccess()
        setPcaDiagnosis(diagnosisResult)
        
        // Finalmente intentamos obtener los datos PCA
        try {
          const pcaAllData = await getAllPCA()
          setPcaData(pcaAllData)
        } catch (pcaError) {
          console.error('Error final obteniendo PCA:', pcaError)
          setPcaData([])
        }
        
        console.log('Todas las calls:', callsData)
        console.log('Test todas las tablas:', allTablesResult)
        console.log('Diagnóstico PCA:', diagnosisResult)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Cargando datos de debug...</div>

  return (
    <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg m-4 shadow-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800 bg-yellow-100 p-2 rounded">🔍 Debug: Datos de Calls y PCA</h3>
      
      {/* Test de acceso a todas las tablas */}
      <div className="mb-4 p-3 bg-white rounded border border-gray-300 shadow-sm">
        <h4 className="font-semibold mb-2 text-gray-700">🔍 Test de Acceso a Todas las Tablas</h4>
        {allTablesTest ? (
          <div className="space-y-2">
            {Object.entries(allTablesTest).map(([table, result]: [string, any]) => (
              <div key={table} className="flex items-center justify-between p-2 rounded bg-gray-50">
                <span className="font-medium text-gray-700 capitalize">{table}:</span>
                <div className={`text-sm font-medium ${result.error ? 'text-red-600' : 'text-green-600'}`}>
                  {result.error ? (
                    <>❌ Error: {result.error}</>
                  ) : (
                    <>✅ {result.count} registros</>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Cargando tests...</div>
        )}
      </div>

      {/* Diagnóstico específico de PCA */}
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded shadow-sm">
        <h4 className="font-semibold mb-2 text-red-800">🚨 Diagnóstico Específico PCA</h4>
        {pcaDiagnosis ? (
          <div className="space-y-2">
            {pcaDiagnosis.map((test: any, index: number) => (
              <div key={index} className="p-2 rounded bg-white border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-700">{test.test}:</span>
                  <span className={`text-sm font-medium ${test.success ? 'text-green-600' : 'text-red-600'}`}>
                    {test.success ? '✅' : '❌'} {test.result}
                  </span>
                </div>
                {test.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                    Error: {test.error}
                  </div>
                )}
                {test.sampleData && test.sampleData.length > 0 && (
                  <div className="text-xs text-green-600 bg-green-50 p-1 rounded mt-1">
                    Muestra: {JSON.stringify(test.sampleData.slice(0, 2))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Ejecutando diagnóstico...</div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-2 text-gray-700 bg-blue-100 p-2 rounded">📞 Calls encontradas ({calls.length})</h4>
          <div className="bg-white p-3 rounded border border-gray-300 text-xs max-h-60 overflow-y-auto">
            {calls.slice(0, 5).map(call => (
              <div key={call.call_id} className="border-b border-gray-200 pb-2 mb-2 text-gray-700">
                <div><strong className="text-blue-600">call_id:</strong> <span className="font-mono">{call.call_id}</span></div>
                <div><strong className="text-green-600">agent:</strong> {call.agent_name || 'N/A'}</div>
                <div><strong className="text-purple-600">business:</strong> {call.business_name || 'N/A'}</div>
                <div>
                  <strong className="text-orange-600">PCA:</strong> 
                  <span className={`ml-1 ${call.hasPCA ? 'text-green-600' : 'text-red-600'}`}>
                    {call.hasPCA ? '✅ Disponible' : '❌ No disponible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2 text-gray-700 bg-green-100 p-2 rounded">📊 PCA encontrados ({pcaData.length})</h4>
          <div className="bg-white p-3 rounded border border-gray-300 text-xs max-h-60 overflow-y-auto">
            {pcaData.slice(0, 10).map((pca, index) => (
              <div key={index} className="border-b border-gray-200 pb-2 mb-2 text-gray-700">
                <div><strong className="text-blue-600">PCA id:</strong> <span className="font-mono">{pca.id}</span></div>
                <div><strong className="text-red-600">PCA call_id:</strong> <span className="font-mono">{pca.call_id}</span></div>
                <div><strong className="text-green-600">agent:</strong> {pca.agent_name || 'N/A'}</div>
              </div>
            ))}
            {pcaData.length === 0 && <p className="text-red-500 font-medium">❌ No se encontraron registros PCA</p>}
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-semibold mb-3 text-gray-700 bg-orange-100 p-2 rounded">🔗 Coincidencias calls.call_id = pca.call_id</h4>
        <div className="bg-white border border-gray-300 rounded text-xs max-h-60 overflow-y-auto">
          {calls.slice(0, 10).map(call => {
            const matchingPCA = pcaData.find(pca => pca.call_id === call.call_id)
            return (
              <div key={call.call_id} className={`p-3 mb-2 border-l-4 ${matchingPCA ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <div><strong className="text-gray-600">Calls.call_id:</strong> <span className="font-mono text-blue-600">{call.call_id}</span></div>
                <div className="mt-1">
                  <strong className="text-gray-600">Resultado:</strong> 
                  <span className={`ml-1 font-medium ${matchingPCA ? 'text-green-600' : 'text-red-600'}`}>
                    {matchingPCA ? '✅ PCA encontrado (pca.call_id: ' + matchingPCA.call_id + ')' : '❌ No encontrado en PCA'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-semibold mb-3 text-gray-700 bg-purple-100 p-2 rounded">📋 Todos los call_ids en PCA</h4>
        <div className="bg-white p-3 border border-gray-300 rounded text-xs max-h-40 overflow-y-auto">
          {pcaData.length > 0 ? (
            pcaData.map((pca, index) => (
              <span key={index} className="inline-block mr-2 mb-2 px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-xs">
                {pca.call_id}
              </span>
            ))
          ) : (
            <p className="text-red-500 font-medium">❌ No hay registros PCA disponibles</p>
          )}
        </div>
      </div>
    </div>
  )
}