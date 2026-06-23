import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { LogOut, Calendar, Users, Settings, Scissors, Copy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const [role, setRole] = useState<'admin' | 'barbeiro' | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setRole(data.role as 'admin' | 'barbeiro')
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/cliente`
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Link público copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)
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
          <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
            <Calendar className="mr-3 h-5 w-5" /> Minha Agenda
          </Button>
          
          {role === 'admin' && (
            <>
              <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                <Users className="mr-3 h-5 w-5" /> Barbeiros
              </Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                <Scissors className="mr-3 h-5 w-5" /> Serviços
              </Button>
              <Button variant="ghost" className="w-full justify-start text-white hover:text-[#D4AF37] hover:bg-[#1A1A1A]">
                <Settings className="mr-3 h-5 w-5" /> Configurações
              </Button>
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-400">Resumo de hoje</p>
          </div>
          
          <Button 
            onClick={copyPublicLink}
            className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold flex items-center gap-2"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar Link para Clientes'}
          </Button>
        </header>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Agendamentos Hoje</h3>
            <p className="text-3xl font-bold text-[#D4AF37]">0</p>
          </div>
          {role === 'admin' && (
            <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Faturamento do Dia</h3>
              <p className="text-3xl font-bold text-[#D4AF37]">R$ 0,00</p>
            </div>
          )}
        </div>

        {/* Lista de Agenda */}
        <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
          <div className="p-6 border-b border-[#222]">
            <h3 className="text-lg font-bold">Próximos Clientes</h3>
          </div>
          <div className="p-6 text-center text-gray-500">
            Nenhum agendamento para mostrar hoje.
          </div>
        </div>
      </main>
    </div>
  )
}
