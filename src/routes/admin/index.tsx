import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, CheckCircle2, Clock, User, Phone, Check, X, Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { role } = Route.useRouteContext()
  const [copied, setCopied] = useState(false)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchDashboardData(selectedDate)
  }, [role, selectedDate])

  const fetchDashboardData = async (date: Date) => {
    setLoading(true)
    
    const startOfDay = new Date(date)
    startOfDay.setHours(0,0,0,0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23,59,59,999)
    
    let query = supabase
      .from('appointments')
      .select('*, services(nome, preco), barbers(nome)')
      .gte('data_hora_inicio', startOfDay.toISOString())
      .lte('data_hora_inicio', endOfDay.toISOString())
      .order('data_hora_inicio')
      
    const { data, error } = await query
    
    if (!error && data) {
      setAppointments(data)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message)
    } else {
      toast.success(`Agendamento ${status}!`)
      fetchDashboardData(selectedDate)
    }
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
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
      {/* Date Navigation */}
      <div className="flex items-center gap-4 mb-6 bg-[#111] border border-[#222] p-2 rounded-xl w-fit">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="hover:bg-[#1A1A1A]">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 font-bold px-4 w-40 justify-center">
          <CalIcon className="w-4 h-4 text-[#D4AF37]" />
          {format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="hover:bg-[#1A1A1A]">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Agendamentos do Dia</h3>
          <p className="text-3xl font-bold text-[#D4AF37]">{loading ? '...' : appointments.length}</p>
        </div>
        {role === 'admin' && (
          <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Previsão Faturamento</h3>
            <p className="text-3xl font-bold text-[#D4AF37]">
              {loading ? '...' : appointments
                  .filter(a => a.status !== 'cancelado')
                  .reduce((acc, curr) => acc + (curr.preco_cobrado || curr.services?.preco || 0), 0)
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        )}
      </div>

      {/* Lista de Agenda */}
      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <div className="p-6 border-b border-[#222]">
          <h3 className="text-lg font-bold">Agenda</h3>
        </div>
        <div className="divide-y divide-[#222]">
          {loading ? (
             <div className="p-6 text-center text-gray-500">Carregando agenda...</div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum agendamento para este dia.
            </div>
          ) : (
            appointments.map(app => {
              const horaFormatada = format(parseISO(app.data_hora_inicio), 'HH:mm');
              return (
                <div key={app.id} className={`p-6 transition flex items-center justify-between ${app.status === 'cancelado' ? 'bg-red-950/20 opacity-50' : app.status === 'finalizado' ? 'bg-green-950/10' : 'hover:bg-[#151515]'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-xl text-[#D4AF37] w-14">{horaFormatada}</span>
                      <h4 className="font-bold text-lg text-white">
                        {app.cliente_nome}
                      </h4>
                      {app.status === 'agendado' && <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">Agendado</span>}
                      {app.status === 'finalizado' && <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">Finalizado</span>}
                      {app.status === 'cancelado' && <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">Cancelado</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-2 ml-17">
                      <span className="flex items-center gap-1"><User className="w-4 h-4" /> {app.barbers?.nome}</span>
                      <a href={`https://wa.me/55${app.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#D4AF37] transition"><Phone className="w-4 h-4" /> {app.telefone}</a>
                      <span className="flex items-center gap-1 text-gray-300 ml-4 font-medium"><Clock className="w-4 h-4" /> {app.services?.nome}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <span className="block font-bold text-white text-lg">
                      {(app.preco_cobrado || app.services?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {app.status === 'agendado' && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => updateStatus(app.id, 'finalizado')} title="Concluir">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => updateStatus(app.id, 'cancelado')} title="Cancelar">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
