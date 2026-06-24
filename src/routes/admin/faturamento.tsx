import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, CalendarDays, TrendingUp, Calendar, Scissors, Users } from 'lucide-react'
import { toast } from 'sonner'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, parseISO, isWithinInterval } from 'date-fns'

export const Route = createFileRoute('/admin/faturamento')({
  component: FaturamentoAdmin,
})

type Barber = {
  id: string
  nome: string
  comissao_percentual: number
}

type Appointment = {
  id: string
  status: string
  preco_cobrado: number
  data_hora_inicio: string
  barber_id: string
  barbers: {
    nome: string
    comissao_percentual: number
  }
}

type Metrics = {
  hojeRealizado: number
  hojePrevisto: number
  hojeComissaoRealizada: number
  hojeComissaoPrevista: number
  hojeAtendimentos: number
  
  semanaRealizado: number
  semanaPrevisto: number
  semanaComissaoRealizada: number
  semanaComissaoPrevista: number
  semanaAtendimentos: number
  
  mesRealizado: number
  mesPrevisto: number
  mesComissaoRealizada: number
  mesComissaoPrevista: number
  mesAtendimentos: number
}

function FaturamentoAdmin() {
  const { role } = Route.useRouteContext()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all')

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchData()
  }, [role])

  const fetchData = async () => {
    setLoading(true)
    const now = new Date()
    
    const firstDayMonth = startOfMonth(now)
    const lastDayMonth = endOfMonth(now)

    const [apptsRes, barbersRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, status, preco_cobrado, data_hora_inicio, barber_id, barbers(nome, comissao_percentual)')
        .in('status', ['agendado', 'concluido'])
        .gte('data_hora_inicio', firstDayMonth.toISOString())
        .lte('data_hora_inicio', lastDayMonth.toISOString()),
      supabase
        .from('barbers')
        .select('id, nome, comissao_percentual')
        .order('nome')
    ])

    if (apptsRes.error) {
      toast.error('Erro ao buscar agendamentos.')
      console.error(apptsRes.error)
    } else {
      setAppointments(apptsRes.data || [])
    }

    if (barbersRes.error) {
      console.error(barbersRes.error)
    } else {
      setBarbers(barbersRes.data || [])
    }
    
    setLoading(false)
  }

  const metrics = useMemo(() => {
    const now = new Date()
    const firstDayToday = startOfDay(now)
    const lastDayToday = endOfDay(now)
    const firstDayWeek = startOfWeek(now, { weekStartsOn: 1 })
    const lastDayWeek = endOfWeek(now, { weekStartsOn: 1 })

    const m: Metrics = {
      hojeRealizado: 0, hojePrevisto: 0, hojeAtendimentos: 0, hojeComissaoRealizada: 0, hojeComissaoPrevista: 0,
      semanaRealizado: 0, semanaPrevisto: 0, semanaAtendimentos: 0, semanaComissaoRealizada: 0, semanaComissaoPrevista: 0,
      mesRealizado: 0, mesPrevisto: 0, mesAtendimentos: 0, mesComissaoRealizada: 0, mesComissaoPrevista: 0
    }

    const filtered = selectedBarberId === 'all' 
      ? appointments 
      : appointments.filter(a => a.barber_id === selectedBarberId)

    filtered.forEach((appt) => {
      const aptDate = parseISO(appt.data_hora_inicio)
      const isHoje = isWithinInterval(aptDate, { start: firstDayToday, end: lastDayToday })
      const isSemana = isWithinInterval(aptDate, { start: firstDayWeek, end: lastDayWeek })

      const valor = Number(appt.preco_cobrado) || 0
      const comissaoPct = appt.barbers?.comissao_percentual || 0
      const valorComissao = valor * (comissaoPct / 100)

      if (appt.status === 'concluido') {
        m.mesRealizado += valor
        m.mesComissaoRealizada += valorComissao
        m.mesAtendimentos += 1
        if (isSemana) {
          m.semanaRealizado += valor
          m.semanaComissaoRealizada += valorComissao
          m.semanaAtendimentos += 1
        }
        if (isHoje) {
          m.hojeRealizado += valor
          m.hojeComissaoRealizada += valorComissao
          m.hojeAtendimentos += 1
        }
      } else if (appt.status === 'agendado') {
        m.mesPrevisto += valor
        m.mesComissaoPrevista += valorComissao
        m.mesAtendimentos += 1
        if (isSemana) {
          m.semanaPrevisto += valor
          m.semanaComissaoPrevista += valorComissao
          m.semanaAtendimentos += 1
        }
        if (isHoje) {
          m.hojePrevisto += valor
          m.hojeComissaoPrevista += valorComissao
          m.hojeAtendimentos += 1
        }
      }
    })
    return m
  }, [appointments, selectedBarberId])

  const brl = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full"><p className="text-gray-400">Calculando faturamento e comissões...</p></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-bebas tracking-wider text-white">
            <DollarSign className="inline-block mr-2 text-[#D4AF37] h-8 w-8 mb-1" />
            Faturamento e Comissões
          </h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe a receita, comissões e fluxo de caixa</p>
        </div>
        
        <div className="w-full md:w-64">
          <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Filtrar por Barbeiro</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select 
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded-lg py-2 pl-10 pr-4 text-white outline-none focus:border-[#D4AF37] transition-colors"
            >
              <option value="all">Todos os Barbeiros (Visão Geral)</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.nome} ({b.comissao_percentual}%)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* HOJE */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <CalendarDays className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Hoje</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Realizado</p>
              <p className="text-2xl font-bold text-green-500">{brl(metrics.hojeRealizado)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Previsto</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{brl(metrics.hojePrevisto)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Comissões (Real. + Prev.)</p>
              <p className="text-2xl font-bold text-purple-500">{brl(metrics.hojeComissaoRealizada + metrics.hojeComissaoPrevista)}</p>
              <p className="text-xs text-gray-500 mt-1">Sendo {brl(metrics.hojeComissaoRealizada)} já pago</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.hojeAtendimentos}</p>
            </div>
          </div>
        </div>

        {/* SEMANA */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Nesta Semana</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Realizado</p>
              <p className="text-2xl font-bold text-green-500">{brl(metrics.semanaRealizado)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Previsto</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{brl(metrics.semanaPrevisto)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Comissões (Real. + Prev.)</p>
              <p className="text-2xl font-bold text-purple-500">{brl(metrics.semanaComissaoRealizada + metrics.semanaComissaoPrevista)}</p>
              <p className="text-xs text-gray-500 mt-1">Sendo {brl(metrics.semanaComissaoRealizada)} já pago</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.semanaAtendimentos}</p>
            </div>
          </div>
        </div>

        {/* MÊS */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Calendar className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Neste Mês</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Realizado</p>
              <p className="text-3xl font-bold text-green-500">{brl(metrics.mesRealizado)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Faturamento Previsto</p>
              <p className="text-3xl font-bold text-[#D4AF37]">{brl(metrics.mesPrevisto)}</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Comissões (Real. + Prev.)</p>
              <p className="text-3xl font-bold text-purple-500">{brl(metrics.mesComissaoRealizada + metrics.mesComissaoPrevista)}</p>
              <p className="text-xs text-gray-500 mt-1">Sendo {brl(metrics.mesComissaoRealizada)} já pago</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-3xl font-bold text-blue-500">{metrics.mesAtendimentos}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
