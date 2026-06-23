import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, CheckCircle2, Clock, User, Phone, Check, X, Calendar as CalIcon, ChevronLeft, ChevronRight, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  // Check-in Modal State
  const [isCheckinOpen, setIsCheckinOpen] = useState(false)
  const [checkinCode, setCheckinCode] = useState('')
  const [checkinError, setCheckinError] = useState('')
  const [foundAppt, setFoundAppt] = useState<any>(null)

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

  const handleValidateCode = async () => {
    setCheckinError('')
    if (checkinCode.length < 4) return
    
    // Procura o agendamento no banco pelo codigo e que não esteja cancelado/finalizado
    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(nome, preco), barbers(nome)')
      .eq('codigo_confirmacao', checkinCode)
      .eq('status', 'agendado')
      .maybeSingle()
      
    if (error || !data) {
      setCheckinError('Código inválido ou agendamento não encontrado.')
      setFoundAppt(null)
    } else {
      setFoundAppt(data)
    }
  }

  const confirmCheckin = async () => {
    if (!foundAppt) return
    await updateStatus(foundAppt.id, 'finalizado')
    setIsCheckinOpen(false)
    setCheckinCode('')
    setFoundAppt(null)
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Resumo de hoje</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => { setIsCheckinOpen(true); setCheckinCode(''); setFoundAppt(null); setCheckinError(''); }}
            className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            Validar Chegada
          </Button>
          <Button 
            variant="outline"
            onClick={copyPublicLink}
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold flex items-center gap-2"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </Button>
        </div>
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

      {/* Check-in Modal */}
      {isCheckinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-[#111] border border-[#222] rounded-xl p-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#1A1A1A] text-[#D4AF37]">
              <QrCode className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Validar Chegada</h2>
            <p className="text-gray-400 text-sm mb-6">Digite o código de 4 dígitos fornecido pelo cliente.</p>
            
            {!foundAppt ? (
              <div className="space-y-4">
                <Input 
                  autoFocus
                  maxLength={4}
                  value={checkinCode}
                  onChange={e => setCheckinCode(e.target.value)}
                  onKeyUp={e => e.key === 'Enter' && handleValidateCode()}
                  placeholder="0000"
                  className="bg-[#1A1A1A] border-[#333] text-center text-4xl tracking-widest py-8 font-mono placeholder:text-gray-600 focus:border-[#D4AF37]"
                />
                {checkinError && <p className="text-red-400 text-sm">{checkinError}</p>}
                
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsCheckinOpen(false)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Cancelar</Button>
                  <Button onClick={handleValidateCode} className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Buscar</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333]">
                  <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">Cliente Encontrado</p>
                  <p className="text-2xl font-bold text-[#D4AF37] mb-2">{foundAppt.cliente_nome}</p>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><span className="text-gray-500">Serviço:</span> {foundAppt.services?.nome}</p>
                    <p><span className="text-gray-500">Barbeiro:</span> {foundAppt.barbers?.nome}</p>
                    <p><span className="text-gray-500">Horário:</span> {format(parseISO(foundAppt.data_hora_inicio), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setFoundAppt(null)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Voltar</Button>
                  <Button onClick={confirmCheckin} className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Concluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
