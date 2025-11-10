"use client"

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

export default function ImportacionPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

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
      const counts = {
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
        setResult('Archivo vacío')
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
      // Eliminar duplicados con respecto a la base de datos
      const phoneNumbers = uniqueData.map(d => d.phone_number).filter(Boolean)
      const { data: existentes } = await supabase
        .from('leads')
        .select('phone_number')
        .in('phone_number', phoneNumbers)
      const existentesSet = new Set((existentes || []).map((e: any) => e.phone_number))
      const nuevos = uniqueData.filter(d => !existentesSet.has(d.phone_number))
      const omitidos = uniqueData.filter(d => existentesSet.has(d.phone_number))
      if (nuevos.length === 0) {
        setResult(`No hay registros nuevos para importar. Se omitieron ${omitidos.length} duplicados.`)
        setImporting(false)
        return
      }
      const { error } = await supabase
        .from('leads')
        .insert(nuevos)
      if (error) {
        setResult(`Error al importar: ${error.message}. Se omitieron ${omitidos.length} duplicados.`)
      } else {
        setResult(`Importación exitosa: ${nuevos.length} registros nuevos agregados. Se omitieron ${omitidos.length} duplicados.`)
      }
    } catch (err: any) {
      setResult('Error al procesar el archivo: ' + err.message)
    }
    setImporting(false)
  }

  return (
    <div className="min-h-screen bg-theme-surface">
      <Sidebar activeItem="importacion" />
      <main className="ml-64 p-8">
        <div className="bg-theme-surface rounded-theme-lg border border-theme-border shadow-sm p-6 max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-theme-text-primary mb-6">Importación de Leads</h2>
          <div className="mb-4">
            <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm" />
          </div>
          <button
            className="px-4 py-2 bg-theme-primary text-white rounded-theme font-medium disabled:opacity-50"
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? 'Importando...' : 'Importar'}
          </button>
          {result && (
            <div className="mt-4 text-theme-text-secondary">{result}</div>
          )}
          <div className="mt-6 text-xs text-theme-text-muted">
            El archivo debe tener los siguientes encabezados: <br />
            <span className="font-mono">phone_number, owner_name, business_name, address, timezone, email</span>
          </div>
        </div>
      </main>
    </div>
  )
}
