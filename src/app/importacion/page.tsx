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
      const rows = text.split('\n').map(row => row.split(','))
      const headers = rows[0].map(h => h.trim())
      // Parsear datos y eliminar duplicados internos del archivo
      const data: any[] = rows.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((h, i) => {
          if (h === 'phone_number') {
            // Normalizar: solo dígitos
            obj[h] = row[i]?.replace(/\D/g, '') || ''
          } else {
            obj[h] = row[i]?.trim() || ''
          }
        })
        return obj
      })
      const uniqueDataMap = new Map<string, any>()
      data.forEach((d: any) => {
        if (d.phone_number && !uniqueDataMap.has(d.phone_number)) {
          uniqueDataMap.set(d.phone_number, d)
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
