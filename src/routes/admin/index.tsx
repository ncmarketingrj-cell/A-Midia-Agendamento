import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, CheckCircle2, Clock, User, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { role } = Route.useRouteContext()
  const [copied, setCopied] = useState(false)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [role])

  const fetchDashboardData = async () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    
    // We assume the user profile ID might map to a barber ID, but for now
    // if role === 'barbeiro', we'd need their barber_id.
    // As a simplification until user mapping is fully robust, we just fetch all if admin.
    let query = supabase
      .from('appointments')
      .select('*, services(nome, preco), barbers(nome)')
      .eq('appointment_date', today)
      .order('start_time')
      
    // TODO: If role === 'barbeiro', filter by their barber_id

    const { data, error } = await query
    
    if (!error && data) {
      setAppointments(data)
    }
    setLoading(false)
  }

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/cliente`
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Link público copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
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
          <p className="text-3xl font-bold text-[#D4AF37]">{loading ? '...' : appointments.length}</p>
        </div>
        {role === 'admin' && (
          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Faturamento do Dia</h3>
            <p className="text-3xl font-bold text-[#D4AF37]">
              {loading ? '...' : appointments.reduce((acc, curr) => acc + (curr.services?.preco || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        )}
      </div>

      {/* Lista de Agenda */}
      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <div className="p-6 border-b border-[#222]">
          <h3 className="text-lg font-bold">Próximos Clientes</h3>
        </div>
        <div className="divide-y divide-[#222]">
          {loading ? (
             <div className="p-6 text-center text-gray-500">Carregando agenda...</div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum agendamento para mostrar hoje.
            </div>
          ) : (
            appointments.map(app => (
              <div key={app.id} className="p-6 hover:bg-[#151515] transition flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    {app.client_name}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {app.start_time}</span>
                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {app.barbers?.nome}</span>
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {app.client_phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-[#D4AF37]">{app.services?.nome}</span>
                  <span className="text-sm text-gray-400">
                    {(app.services?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
