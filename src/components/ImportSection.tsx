"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const text = await file.text()

      // Detectar delimitador (coma/; / tab)
      const firstLine = text.split(/\r?\n/)[0] || ''
      const counts: Record<string, number> = {
        ',': (firstLine.match(/,/g) || []).length,
        ';': (firstLine.match(/;/g) || []).length,
        '\t': (firstLine.match(/\t/g) || []).length
      }
      let delimiter = ','
      if (counts[';'] > counts[',']) delimiter = ';'
      if (counts['\t'] > counts[delimiter]) delimiter = '\t'

      // Simple parser de líneas que respeta comillas dobles y duplicados de comilla
      const splitLine = (line: string) => {
        const out: string[] = []
        let cur = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (ch === delimiter && !inQuotes) {
            out.push(cur)
            cur = ''
          } else {
            cur += ch
          }
        }
        out.push(cur)
        return out.map(s => s.trim())
      }

      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
      if (lines.length === 0) {
        setResult({ type: 'error', message: 'Archivo vacío' })
        setImporting(false)
        return
      }

      const rawHeaders = splitLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim())

      // Mapear aliases a los campos esperados
      const aliasMap: Record<string, string[]> = {
        phone_number: ['phone_number','phone','customer_phone','customer phone','customer_phone_number','telefono','celular'],
        owner_name: ['owner_name','owner','owner name','propietario'],
        business_name: ['business_name','business','business name','company','negocio'],
        address: ['address','street','direccion','address_street'],
        location_type: ['location_type','location type','type','loc_type'],
        timezone: ['timezone','tz'],
        email: ['email','owner_email','email_address']
      }

      const headerLower = rawHeaders.map(h => h.toLowerCase())
      const headerIndex: Record<string, number> = {}
      for (const key of Object.keys(aliasMap)) {
        const aliases = aliasMap[key]
        let found = -1
        for (const a of aliases) {
          const idx = headerLower.indexOf(a.toLowerCase())
          if (idx !== -1) { found = idx; break }
        }
        if (found !== -1) headerIndex[key] = found
      }

      // Build data objects using mapped indices
      const data: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const row = splitLine(lines[i])
        const obj: any = {}
        // fill requested fields if present
        for (const field of Object.keys(aliasMap)) {
          const idx = headerIndex[field]
          const raw = (idx !== undefined) ? (row[idx] || '') : ''
          if (field === 'phone_number') {
            obj[field] = (raw || '').replace(/\D/g, '')
          } else {
            obj[field] = (raw || '').trim()
          }
        }
        data.push(obj)
      }
      const uniqueDataMap = new Map<string, any>()
      data.forEach((d: any) => {
        const num = d.phone_number || ''
        if (num && !uniqueDataMap.has(num)) {
          uniqueDataMap.set(num, d)
        }
      })
      const uniqueData = Array.from(uniqueDataMap.values())
      
      // Intentar insertar todos los registros únicos del archivo.
      // Usamos upsert con ignoreDuplicates: true para que la BD descarte silenciosamente los que ya existen.
      // .select() nos devolverá solo los registros que realmente se insertaron.
      const { data: insertedData, error } = await supabase
        .from('leads')
        .upsert(uniqueData, { onConflict: 'phone_number', ignoreDuplicates: true })
        .select()

      if (error) {
        setResult({ type: 'error', message: `Error al importar: ${error.message}` })
      } else {
        const insertedCount = insertedData ? insertedData.length : 0
        const totalProcessed = uniqueData.length
        const duplicatesInDb = totalProcessed - insertedCount
        const duplicatesInFile = data.length - uniqueData.length
        
        const totalOmitted = duplicatesInDb + duplicatesInFile

        if (insertedCount === 0) {
           setResult({ type: 'info', message: `No hay registros nuevos. Se procesaron ${data.length} filas y todas eran duplicadas.` })
        } else {
           setResult({ type: 'success', message: `Importación exitosa: ${insertedCount} registros nuevos agregados. Se omitieron ${totalOmitted} duplicados (${duplicatesInFile} en archivo, ${duplicatesInDb} en base de datos).` })
        }
      }
    } catch (err: any) {
      setResult({ type: 'error', message: 'Error al procesar el archivo: ' + err.message })
    }
    setImporting(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Cargar archivo CSV</h2>
          <p className="text-sm text-slate-500">Selecciona un archivo CSV con los datos de los leads</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
            " 
          />
          <button
            className={`
              px-6 py-2 rounded-lg font-medium text-white transition-colors
              ${!file || importing 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
              }
            `}
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? 'Importando...' : 'Importar Leads'}
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg text-sm ${
            result.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            result.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {result.message}
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Formato requerido</h3>
          <p className="text-xs text-slate-500 mb-3">
            El archivo CSV debe contener encabezados. El sistema intentará mapear automáticamente columnas comunes como:
          </p>
          <div className="flex flex-wrap gap-2">
            {['phone_number', 'owner_name', 'business_name', 'address', 'timezone', 'email'].map(field => (
              <span key={field} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600">
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
