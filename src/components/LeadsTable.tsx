'use client'

import { useState, useEffect, useRef } from 'react'
import { Lead, getLeadsWithPagination, getCallHistoryByPhone, Call, CallInteraction, LeadPaginationParams, PaginatedLeadsResult } from '@/lib/supabase'

import React from 'react'

// LeadsTable removed — archived to /archive/leads/
interface LeadsTableProps {
  onCallSelect?: (call: Call) => void
}

export default function LeadsTable({ onCallSelect }: LeadsTableProps) {
  return (
    <div className="p-6">
      <div className="rounded-xl p-6 border shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-textPrimary)' }}>Sección "Leads" eliminada</h3>
        <p style={{ color: 'var(--color-textSecondary)' }}>Este módulo fue archivado. Si necesitas restaurarlo, encontrarás el código en <code>archive/leads/</code>.</p>
      </div>
    </div>
  )
}