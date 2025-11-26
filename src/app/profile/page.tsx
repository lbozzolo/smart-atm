'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ProtectedRoute, { useAuth } from '@/components/ProtectedRoute'
import { getUserProfile, Profile, updateUserProfile } from '@/lib/supabase'

export default function ProfilePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (user) {
      loadProfile(user.id)
    }
  }, [user])

  async function loadProfile(userId: string) {
    setLoading(true)
    const data = await getUserProfile(userId)
    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await updateUserProfile(user.id, {
        full_name: fullName
      })
      alert('Perfil actualizado correctamente')
    } catch (error) {
      console.error(error)
      alert('Error al actualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Sidebar activeItem="profile" />
        <Header sidebarCollapsed={sidebarCollapsed} currentPage="Perfil" pageTitle="Mi Perfil" />
        
        <main className={`
          pt-20 pb-8 px-6 transition-all duration-300
          ml-[32rem]
        `}>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-theme-primary/10 rounded-full flex items-center justify-center text-4xl text-theme-primary font-bold">
                    {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">{fullName || 'Usuario'}</h1>
                    <p className="text-slate-500">{user?.email}</p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-slate-400">El email no se puede cambiar.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Cambios</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
