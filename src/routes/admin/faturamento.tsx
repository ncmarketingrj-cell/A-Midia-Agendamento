import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, CalendarDays, TrendingUp, Calendar, Scissors, Users, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns'

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
  realizado: number
  previsto: number
  comissaoRealizada: number
  comissaoPrevista: number
  atendimentos: number
}

function FaturamentoAdmin() {
  const { role } = Route.useRouteContext()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  
  // Filtros
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all')
  const [period, setPeriod] = useState<string>('mes')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
  }, [role])

  useEffect(() => {
    if (period === 'custom' && (!customStartDate || !customEndDate)) {
      return // Aguarda preencher as duas datas
    }
    fetchData()
  }, [period, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()
    let start: Date | null = null
    let end: Date | null = null

    switch (period) {
      case 'hoje':
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case 'semana':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'mes':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'trimestre':
        start = startOfQuarter(now)
        end = endOfQuarter(now)
        break
      case 'semestre':
        const currentMonth = now.getMonth()
        if (currentMonth < 6) {
          start = new Date(now.getFullYear(), 0, 1)
          end = new Date(now.getFullYear(), 5, 30, 23, 59, 59, 999)
        } else {
          start = new Date(now.getFullYear(), 6, 1)
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        }
        break
      case 'ano':
        start = startOfYear(now)
        end = endOfYear(now)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          start = startOfDay(parseISO(customStartDate))
          end = endOfDay(parseISO(customEndDate))
        }
        break
      case 'maximo':
        start = null
        end = null
        break
    }
    return { start, end }
  }

  const fetchData = async () => {
    setLoading(true)
    const { start, end } = getDateRange()

    let apptsQuery = supabase
      .from('appointments')
      .select('id, status, preco_cobrado, data_hora_inicio, barber_id, barbers(nome, comissao_percentual)')
      .in('status', ['agendado', 'concluido'])

    if (start && end) {
      apptsQuery = apptsQuery
        .gte('data_hora_inicio', start.toISOString())
        .lte('data_hora_inicio', end.toISOString())
    }

    const [apptsRes, barbersRes] = await Promise.all([
      apptsQuery,
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
    const m: Metrics = {
      realizado: 0, previsto: 0, comissaoRealizada: 0, comissaoPrevista: 0, atendimentos: 0
    }

    const filtered = selectedBarberId === 'all' 
      ? appointments 
      : appointments.filter(a => a.barber_id === selectedBarberId)

    filtered.forEach((appt) => {
      const valor = Number(appt.preco_cobrado) || 0
      const comissaoPct = appt.barbers?.comissao_percentual || 0
      const valorComissao = valor * (comissaoPct / 100)

      if (appt.status === 'concluido') {
        m.realizado += valor
        m.comissaoRealizada += valorComissao
        m.atendimentos += 1
      } else if (appt.status === 'agendado') {
        m.previsto += valor
        m.comissaoPrevista += valorComissao
        m.atendimentos += 1
      }
    })
    return m
  }, [appointments, selectedBarberId])

  const brl = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-bebas tracking-wider text-white">
            <DollarSign className="inline-block mr-2 text-[#D4AF37] h-8 w-8 mb-1" />
            Gestão Financeira
          </h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe a receita, comissões e fluxo de caixa</p>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-5 w-5 text-[#D4AF37]" />
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-bebas">Filtros</h2>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Barbeiro</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="all">Todos os Barbeiros (Visão Geral)</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>{b.nome} ({b.comissao_percentual}%)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Período</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Nesta Semana</option>
                <option value="mes">Neste Mês</option>
                <option value="trimestre">Neste Trimestre</option>
                <option value="semestre">Neste Semestre</option>
                <option value="ano">Neste Ano</option>
                <option value="maximo">Todo o Período (Máximo)</option>
                <option value="custom">Personalizado (Escolher Datas)</option>
              </select>
            </div>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 pt-2 animate-fade-in">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Data Inicial</label>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-2 px-4 text-white outline-none focus:border-[#D4AF37] [color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Data Final</label>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg py-2 px-4 text-white outline-none focus:border-[#D4AF37] [color-scheme:dark]"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center h-40">
          <p className="text-gray-400 animate-pulse">Carregando métricas do período...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* PAINEL CENTRAL DE RESULTADOS */}
          <div className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-6 relative overflow-hidden">
            {/* Efeito visual decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex items-center mb-6 relative z-10">
              <Calendar className="text-[#D4AF37] h-6 w-6 mr-3" />
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider font-bebas">
                Resultados do Período
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {/* Receita Realizada */}
              <div className="bg-[#1A1A1A] p-5 rounded-xl border-l-4 border-green-500 shadow-lg relative overflow-hidden group hover:border-l-8 transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">Faturamento Realizado</p>
                <p className="text-3xl font-bold text-green-500 mb-1">{brl(metrics.realizado)}</p>
                <p className="text-xs text-gray-500 font-medium">Cortes finalizados</p>
              </div>

              {/* Receita Prevista */}
              <div className="bg-[#1A1A1A] p-5 rounded-xl border-l-4 border-[#D4AF37] shadow-lg relative overflow-hidden group hover:border-l-8 transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-[#D4AF37]/5 rounded-bl-full pointer-events-none"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">Faturamento Previsto</p>
                <p className="text-3xl font-bold text-[#D4AF37] mb-1">{brl(metrics.previsto)}</p>
                <p className="text-xs text-gray-500 font-medium">Restante da agenda</p>
              </div>

              {/* Comissões */}
              <div className="bg-[#1A1A1A] p-5 rounded-xl border-l-4 border-purple-500 shadow-lg relative overflow-hidden group hover:border-l-8 transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">Comissões Calculadas</p>
                <p className="text-3xl font-bold text-purple-500 mb-1">{brl(metrics.comissaoRealizada + metrics.comissaoPrevista)}</p>
                <p className="text-xs text-gray-400 bg-purple-500/10 inline-block px-2 py-0.5 rounded-full font-medium">
                  Pago: {brl(metrics.comissaoRealizada)}
                </p>
              </div>

              {/* Atendimentos */}
              <div className="bg-[#1A1A1A] p-5 rounded-xl border-l-4 border-blue-500 shadow-lg relative overflow-hidden group hover:border-l-8 transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">Total de Atendimentos</p>
                <p className="text-3xl font-bold text-blue-500 mb-1">{metrics.atendimentos}</p>
                <p className="text-xs text-gray-500 font-medium">Clientes na agenda</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
