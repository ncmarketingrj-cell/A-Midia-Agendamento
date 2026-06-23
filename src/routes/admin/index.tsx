import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, CheckCircle2, Clock, User, Phone, Check, X, Calendar as CalIcon, ChevronLeft, ChevronRight, QrCode, Edit2, Trash2, Plus } from 'lucide-react'
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
  const [barbers, setBarbers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedBarber, setSelectedBarber] = useState('all')

  const selectedDateRef = useRef(selectedDate)
  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editAppt, setEditAppt] = useState<any>(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editData, setEditData] = useState('')
  const [editHora, setEditHora] = useState('')
  const [editBarberId, setEditBarberId] = useState('')
  const [editServiceId, setEditServiceId] = useState('')

  // New Appointment Modal State
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newTelefone, setNewTelefone] = useState('')
  const [newData, setNewData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newHora, setNewHora] = useState('')
  const [newBarberId, setNewBarberId] = useState('')
  const [newSelectedServices, setNewSelectedServices] = useState<string[]>([])

  // Check-in Modal State
  const [isCheckinOpen, setIsCheckinOpen] = useState(false)
  const [checkinCode, setCheckinCode] = useState('')
  const [checkinError, setCheckinError] = useState('')
  const [foundAppt, setFoundAppt] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData(selectedDate)
    
    // Fetch barbers and services for filter and edit modal
    supabase.from('barbers').select('id, nome').order('nome').then(({data}) => {
      if(data) setBarbers(data)
    })
    supabase.from('services').select('id, nome, preco').order('nome').then(({data}) => {
      if(data) setServices(data)
    })

    const playNotificationSound = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };
        // Ding Dong sound
        playNote(880, 0, 0.4);      // A5
        playNote(659.25, 0.2, 0.6); // E5
      } catch(e) {
        console.error("Audio block", e);
      }
    };

    // Realtime Subscriptions
    const channel = supabase
      .channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, payload => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
          const appt = payload.new as any;
          const hora = appt.data_hora_inicio ? format(parseISO(appt.data_hora_inicio), 'HH:mm') : '';
          const dataStr = appt.data_hora_inicio ? format(parseISO(appt.data_hora_inicio), 'dd/MM/yyyy') : '';
          
          toast(
            <div className="flex flex-col gap-1">
              <p className="font-bold text-lg text-white mb-1">Novo Agendamento!</p>
              <p className="text-sm text-gray-300"><b>Cliente:</b> {appt.cliente_nome}</p>
              <p className="text-sm text-gray-300"><b>Data:</b> {dataStr} às <span className="text-[#D4AF37] font-bold">{hora}</span></p>
              <p className="text-sm text-gray-300"><b>Serviços:</b> {appt.servicos_resumo || 'Serviço Padrão'}</p>
            </div>,
            {
              duration: 10000,
              icon: '🔔',
              style: { background: '#111', borderColor: '#D4AF37', color: 'white' }
            }
          );
        }
        fetchDashboardData(selectedDateRef.current)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  const deleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir DEFINITIVAMENTE este agendamento? Ele sumirá do histórico.")) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      toast.success('Agendamento excluído!');
      fetchDashboardData(selectedDate);
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

  const openEditModal = (app: any) => {
    setEditAppt(app)
    setEditNome(app.cliente_nome)
    setEditTelefone(app.telefone)
    
    const d = new Date(app.data_hora_inicio)
    setEditData(format(d, 'yyyy-MM-dd'))
    setEditHora(format(d, 'HH:mm'))
    setEditBarberId(app.barber_id)
    setEditServiceId(app.service_id)
    setIsEditOpen(true)
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const [h, m] = editHora.split(":").map(Number);
    const [y, mth, d] = editData.split("-").map(Number);
    const startDt = new Date(y, mth - 1, d, h, m, 0, 0);
    const dataHoraInicio = startDt.toISOString();
    
    const endDt = new Date(startDt);
    endDt.setMinutes(endDt.getMinutes() + 40);

    const { error } = await supabase.from('appointments').update({
      cliente_nome: editNome,
      telefone: editTelefone,
      data_hora_inicio: dataHoraInicio,
      data_hora_fim: endDt.toISOString(),
      barber_id: editBarberId,
      service_id: editServiceId
    }).eq('id', editAppt.id)

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message)
    } else {
      toast.success('Agendamento atualizado (Encaixe feito)!')
      setIsEditOpen(false)
      fetchDashboardData(selectedDate)
    }
    setLoading(false)
  }

  const handleNewSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newSelectedServices.length === 0) {
      toast.error('Selecione pelo menos um serviço!');
      return;
    }
    setLoading(true)
    
    const [h, m] = newHora.split(":").map(Number);
    const [y, mth, d] = newData.split("-").map(Number);
    const startDt = new Date(y, mth - 1, d, h, m, 0, 0);
    const dataHoraInicio = startDt.toISOString();
    
    // Obter os serviços selecionados do array de estado global 'services'
    const servicosObj = services.filter(s => newSelectedServices.includes(s.id));
    const duracaoTotal = servicosObj.reduce((acc, s) => acc + s.duracao_minutos, 0);
    const precoTotal = servicosObj.reduce((acc, s) => acc + s.preco, 0);
    const servicosNomes = servicosObj.map(s => s.nome).join(' + ');

    const endDt = new Date(startDt);
    endDt.setMinutes(endDt.getMinutes() + duracaoTotal);

    // O barbeiro final é o selecionado, ou o próprio se não for admin
    let finalBarberId = newBarberId;
    if (role !== 'admin' && !finalBarberId) {
      // Pega o barbeiro atrelado ao usuário
      // Como o input vai ser oculto ou desativado, newBarberId pode estar vazio.
      // É mais seguro obrigar a selecionar ou auto-selecionar o do barbers[0] assumindo que ele só ve ele mesmo
      finalBarberId = barbers[0]?.id;
    }

    const { error } = await supabase.from('appointments').insert({
      cliente_nome: newNome,
      telefone: newTelefone,
      data_hora_inicio: dataHoraInicio,
      data_hora_fim: endDt.toISOString(),
      barber_id: finalBarberId,
      service_id: servicosObj[0].id, // fallback pro primeiro
      preco_cobrado: precoTotal,
      servicos_resumo: servicosNomes,
      codigo_confirmacao: Math.floor(1000 + Math.random() * 9000).toString(),
      status: 'agendado'
    })

    if (error) {
      toast.error('Erro ao agendar: ' + error.message)
    } else {
      toast.success('Novo agendamento criado com sucesso!')
      setIsNewOpen(false)
      // Reset form
      setNewNome('')
      setNewTelefone('')
      setNewHora('')
      setNewSelectedServices([])
      fetchDashboardData(selectedDate)
    }
    setLoading(false)
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Resumo de hoje</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => {
              setNewNome(''); setNewTelefone(''); setNewHora(''); setNewSelectedServices([]);
              if (role !== 'admin' && barbers.length > 0) { setNewBarberId(barbers[0].id); }
              else { setNewBarberId(''); }
              setIsNewOpen(true);
            }}
            className="flex-1 sm:flex-none bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-white font-bold flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo
          </Button>
          <Button 
            onClick={() => { setIsCheckinOpen(true); setCheckinCode(''); setFoundAppt(null); setCheckinError(''); }}
            className="flex-1 sm:flex-none bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold flex items-center justify-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Validar Chegada</span>
            <span className="sm:hidden">Check-in</span>
          </Button>
          <Button 
            variant="outline"
            onClick={copyPublicLink}
            className="flex-1 sm:flex-none border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold flex items-center justify-center gap-2"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Link'}</span>
            <span className="sm:hidden">{copied ? 'Copiado!' : 'Link'}</span>
          </Button>
        </div>
      </header>

      {/* Date Navigation and Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center justify-between sm:justify-start bg-[#111] border border-[#222] p-2 rounded-xl w-full sm:w-fit">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="hover:bg-[#1A1A1A]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 font-bold px-4 sm:w-40 justify-center">
            <CalIcon className="w-4 h-4 text-[#D4AF37]" />
            {format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="hover:bg-[#1A1A1A]">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {role === 'admin' && barbers.length > 0 && (
          <select 
            value={selectedBarber} 
            onChange={e => setSelectedBarber(e.target.value)}
            className="bg-[#111] border border-[#222] rounded-xl p-3 text-sm font-bold text-gray-300 outline-none focus:border-[#D4AF37]"
          >
            <option value="all">Todos os Barbeiros</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        )}
      </div>

      {(() => {
        const filteredAppointments = selectedBarber === 'all' ? appointments : appointments.filter(a => a.barber_id === selectedBarber);
        const revenue = filteredAppointments
          .filter(a => a.status !== 'cancelado')
          .reduce((acc, curr) => acc + (curr.preco_cobrado || curr.services?.preco || 0), 0);
        
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Agendamentos do Dia</h3>
                <p className="text-3xl font-bold text-[#D4AF37]">{loading ? '...' : filteredAppointments.length}</p>
              </div>
              {role === 'admin' && (
                <div className="bg-[#111] p-6 rounded-xl border border-[#222]">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Previsão Faturamento</h3>
                  <p className="text-3xl font-bold text-[#D4AF37]">
                    {loading ? '...' : revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                ) : filteredAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Nenhum agendamento para este dia com o filtro atual.
                  </div>
                ) : (
                  filteredAppointments.map(app => {
              const horaFormatada = format(parseISO(app.data_hora_inicio), 'HH:mm');
              return (
                <div key={app.id} className={`p-4 sm:p-6 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 ${app.status === 'cancelado' ? 'bg-red-950/20 opacity-50' : app.status === 'finalizado' ? 'bg-green-950/10' : 'hover:bg-[#151515]'}`}>
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <span className="font-bold text-xl text-[#D4AF37] w-14">{horaFormatada}</span>
                      <h4 className="font-bold text-lg text-white">
                        {app.cliente_nome}
                      </h4>
                      {app.status === 'agendado' && <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">Agendado</span>}
                      {app.status === 'finalizado' && <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">Finalizado</span>}
                      {app.status === 'cancelado' && <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">Cancelado</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-400 mt-2 sm:ml-17">
                      <span className="flex items-center gap-1"><User className="w-4 h-4" /> {app.barbers?.nome}</span>
                      <a href={`https://wa.me/55${app.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#D4AF37] transition"><Phone className="w-4 h-4" /> {app.telefone}</a>
                      <span className="flex items-center gap-1 text-gray-300 font-medium"><Clock className="w-4 h-4" /> {app.servicos_resumo || app.services?.nome}</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto text-right flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t border-[#222] sm:border-0 pt-4 sm:pt-0">
                    <span className="block font-bold text-white text-lg">
                      {(app.preco_cobrado || app.services?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {app.status === 'agendado' && (
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => openEditModal(app)} title="Editar / Encaixe">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => updateStatus(app.id, 'finalizado')} title="Concluir">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => updateStatus(app.id, 'cancelado')} title="Cancelar">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {role === 'admin' && (
                      <Button size="icon" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 ml-4" onClick={() => deleteAppointment(app.id)} title="Excluir Definitivamente">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      </>
      )
    })()}

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
      {/* Edit/Encaixe Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-2 text-white">Editar Agendamento</h2>
            <p className="text-gray-400 text-sm mb-6">Reagende ou faça um encaixe alterando os dados abaixo.</p>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Nome do Cliente</label>
                <Input required value={editNome} onChange={e => setEditNome(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">WhatsApp</label>
                <Input required value={editTelefone} onChange={e => setEditTelefone(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Data</label>
                  <Input required type="date" value={editData} onChange={e => setEditData(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Hora</label>
                  <Input required type="time" value={editHora} onChange={e => setEditHora(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1 [color-scheme:dark]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Barbeiro</label>
                  <select required value={editBarberId} onChange={e => setEditBarberId(e.target.value)} className="w-full mt-1 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-white outline-none focus:border-[#D4AF37]">
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Serviço</label>
                  <select required value={editServiceId} onChange={e => setEditServiceId(e.target.value)} className="w-full mt-1 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-white outline-none focus:border-[#D4AF37]">
                    {services.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Novo Agendamento Modal */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-xl p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-2 text-white">Novo Agendamento</h2>
            <p className="text-gray-400 text-sm mb-6">Crie um agendamento manualmente na agenda.</p>
            
            <form onSubmit={handleNewSave} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Nome do Cliente</label>
                <Input required value={newNome} onChange={e => setNewNome(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">WhatsApp</label>
                <Input required value={newTelefone} onChange={e => setNewTelefone(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Data</label>
                  <Input required type="date" value={newData} onChange={e => setNewData(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Hora</label>
                  <Input required type="time" value={newHora} onChange={e => setNewHora(e.target.value)} className="bg-[#1A1A1A] border-[#333] mt-1 [color-scheme:dark]" />
                </div>
              </div>
              
              {role === 'admin' ? (
                <div>
                  <label className="text-xs text-gray-400 uppercase">Barbeiro</label>
                  <select required value={newBarberId} onChange={e => setNewBarberId(e.target.value)} className="w-full mt-1 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-white outline-none focus:border-[#D4AF37]">
                    <option value="" disabled>Selecione</option>
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="text-xs text-gray-400 uppercase mb-2 block">Serviços</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#1A1A1A] border border-[#333] rounded-md">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newSelectedServices.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewSelectedServices([...newSelectedServices, s.id])
                          else setNewSelectedServices(newSelectedServices.filter(id => id !== s.id))
                        }}
                        className="accent-[#D4AF37]"
                      />
                      {s.nome}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Criar Agendamento</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
