import { createFileRoute, redirect, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { LogOut, Calendar, Users, Scissors, Clock, MessageCircle, UserCheck, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user || error) {
      throw redirect({ to: '/login' })
    }
    
    // Fetch role here and pass it down via context
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
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
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-[#111] border-r border-[#222] p-6 flex-col h-screen sticky top-0">
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
              <Link to="/admin/clientes" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
                <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                  <UserCheck className="mr-3 h-5 w-5" /> CRM / Clientes
                </Button>
              </Link>
              <Link to="/admin/mensagens" className="[&.active>button]:bg-[#1A1A1A] [&.active>button]:text-[#D4AF37]">
                <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                  <MessageCircle className="mr-3 h-5 w-5" /> Mensagens
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
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#222] z-50 flex justify-around p-2 items-center">
        <Link to="/admin" className="[&.active>button]:text-[#D4AF37] flex-1">
          <Button variant="ghost" className="w-full flex-col items-center gap-1 h-auto py-2 text-gray-400 hover:text-[#D4AF37]">
            <Calendar className="h-5 w-5" /> <span className="text-[10px]">Agenda</span>
          </Button>
        </Link>
        
        {role === 'admin' && (
          <>
            <Link to="/admin/barbeiros" className="[&.active>button]:text-[#D4AF37] flex-1">
              <Button variant="ghost" className="w-full flex-col items-center gap-1 h-auto py-2 text-gray-400 hover:text-[#D4AF37]">
                <Users className="h-5 w-5" /> <span className="text-[10px]">Barbeiros</span>
              </Button>
            </Link>
            <Link to="/admin/clientes" className="[&.active>button]:text-[#D4AF37] flex-1">
              <Button variant="ghost" className="w-full flex-col items-center gap-1 h-auto py-2 text-gray-400 hover:text-[#D4AF37]">
                <UserCheck className="h-5 w-5" /> <span className="text-[10px]">CRM</span>
              </Button>
            </Link>
            <Link to="/admin/servicos" className="[&.active>button]:text-[#D4AF37] flex-1">
              <Button variant="ghost" className="w-full flex-col items-center gap-1 h-auto py-2 text-gray-400 hover:text-[#D4AF37]">
                <Scissors className="h-5 w-5" /> <span className="text-[10px]">Serviços</span>
              </Button>
            </Link>
            <Link to="/admin/horarios" className="[&.active>button]:text-[#D4AF37] flex-1">
              <Button variant="ghost" className="w-full flex-col items-center gap-1 h-auto py-2 text-gray-400 hover:text-[#D4AF37]">
                <Clock className="h-5 w-5" /> <span className="text-[10px]">Horários</span>
              </Button>
            </Link>
          </>
        )}
        
        <Button variant="ghost" onClick={handleLogout} className="w-full flex-col items-center gap-1 h-auto py-2 text-red-400 hover:text-red-300 flex-1">
          <LogOut className="h-5 w-5" /> <span className="text-[10px]">Sair</span>
        </Button>
      </nav>
    </div>
  )
}
