import { createFileRoute, redirect, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { LogOut, Calendar, Users, Scissors, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    
    // Fetch role here and pass it down via context
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', session.user.id)
      .single()
      
    return { role: (data?.role as 'admin' | 'barbeiro') || null }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { role } = Route.useRouteContext()
  const [loading, setLoading] = useState(false) // No need to load here anymore
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">Carregando...</div>

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-[#222] p-6 flex flex-col h-screen sticky top-0">
        <div className="mb-10">
          <h2 className="text-2xl font-bold uppercase tracking-wider font-bebas">
            A Mídia <span className="text-[#D4AF37]">Admin</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Painel de Controle</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/admin" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
            <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
              <Calendar className="mr-3 h-5 w-5" /> Minha Agenda
            </Button>
          </Link>
          
          {role === 'admin' && (
            <>
              <Link to="/admin/barbeiros" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
                <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                  <Users className="mr-3 h-5 w-5" /> Barbeiros
                </Button>
              </Link>
              <Link to="/admin/servicos" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
                <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                  <Scissors className="mr-3 h-5 w-5" /> Serviços
                </Button>
              </Link>
              <Link to="/admin/horarios" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
                <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                  <Clock className="mr-3 h-5 w-5" /> Horários
                </Button>
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#222]">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium">{role === 'admin' ? 'Administrador' : 'Barbeiro'}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full border-[#333] text-gray-300 hover:bg-[#1A1A1A] hover:text-white">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <Outlet />
    </div>
  )
}
