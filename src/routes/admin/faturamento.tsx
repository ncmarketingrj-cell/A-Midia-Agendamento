import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, CalendarDays, TrendingUp, Calendar, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, parseISO, isWithinInterval } from 'date-fns'

export const Route = createFileRoute('/admin/faturamento')({
  component: FaturamentoAdmin,
})

type Appointment = {
  id: string
  status: string
  preco_cobrado: number
  data_hora_inicio: string
}

type Metrics = {
  hojeRealizado: number
  hojePrevisto: number
  hojeAtendimentos: number
  
  semanaRealizado: number
  semanaPrevisto: number
  semanaAtendimentos: number
  
  mesRealizado: number
  mesPrevisto: number
  mesAtendimentos: number
}

function FaturamentoAdmin() {
  const { role } = Route.useRouteContext()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics>({
    hojeRealizado: 0, hojePrevisto: 0, hojeAtendimentos: 0,
    semanaRealizado: 0, semanaPrevisto: 0, semanaAtendimentos: 0,
    mesRealizado: 0, mesPrevisto: 0, mesAtendimentos: 0
  })

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchMetrics()
  }, [role])

  const fetchMetrics = async () => {
    setLoading(true)
    const now = new Date()
    
    // Obter limites do mês atual para não baixar dados antigos desnecessariamente
    const firstDayMonth = startOfMonth(now)
    const lastDayMonth = endOfMonth(now)

    // Ajustar semana (começando no domingo ou segunda, date-fns usa domingo como padrão)
    const firstDayWeek = startOfWeek(now, { weekStartsOn: 1 }) // Semana começa na segunda
    const lastDayWeek = endOfWeek(now, { weekStartsOn: 1 })

    const firstDayToday = startOfDay(now)
    const lastDayToday = endOfDay(now)

    const { data, error } = await supabase
      .from('appointments')
      .select('id, status, preco_cobrado, data_hora_inicio')
      .in('status', ['agendado', 'concluido'])
      .gte('data_hora_inicio', firstDayMonth.toISOString())
      .lte('data_hora_inicio', lastDayMonth.toISOString())

    if (error) {
      toast.error('Erro ao buscar dados de faturamento.')
      console.error(error)
      setLoading(false)
      return
    }

    const m: Metrics = {
      hojeRealizado: 0, hojePrevisto: 0, hojeAtendimentos: 0,
      semanaRealizado: 0, semanaPrevisto: 0, semanaAtendimentos: 0,
      mesRealizado: 0, mesPrevisto: 0, mesAtendimentos: 0
    }

    if (data) {
      data.forEach((appt: Appointment) => {
        const aptDate = parseISO(appt.data_hora_inicio)
        const isHoje = isWithinInterval(aptDate, { start: firstDayToday, end: lastDayToday })
        const isSemana = isWithinInterval(aptDate, { start: firstDayWeek, end: lastDayWeek })
        // Mês já está filtrado pela query
        const isMes = true 

        const valor = Number(appt.preco_cobrado) || 0

        // Cálculos do Mês
        if (appt.status === 'concluido') {
          m.mesRealizado += valor
          m.mesAtendimentos += 1
          
          if (isSemana) {
            m.semanaRealizado += valor
            m.semanaAtendimentos += 1
          }
          if (isHoje) {
            m.hojeRealizado += valor
            m.hojeAtendimentos += 1
          }
        } else if (appt.status === 'agendado') {
          m.mesPrevisto += valor
          m.mesAtendimentos += 1
          
          if (isSemana) {
            m.semanaPrevisto += valor
            m.semanaAtendimentos += 1
          }
          if (isHoje) {
            m.hojePrevisto += valor
            m.hojeAtendimentos += 1
          }
        }
      })
    }

    setMetrics(m)
    setLoading(false)
  }

  const brl = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full"><p className="text-gray-400">Calculando faturamento...</p></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-bold font-bebas tracking-wider text-white">
          <DollarSign className="inline-block mr-2 text-[#D4AF37] h-8 w-8 mb-1" />
          Faturamento
        </h1>
        <p className="text-gray-400 text-sm mt-1">Acompanhe a receita e o fluxo de caixa da barbearia</p>
      </div>

      <div className="space-y-6">
        {/* HOJE */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <CalendarDays className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Hoje</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Realizada</p>
              <p className="text-2xl font-bold text-green-500">{brl(metrics.hojeRealizado)}</p>
              <p className="text-xs text-gray-500 mt-1">Cortes já concluídos hoje</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Prevista</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{brl(metrics.hojePrevisto)}</p>
              <p className="text-xs text-gray-500 mt-1">Na agenda para hoje</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.hojeAtendimentos}</p>
              <p className="text-xs text-gray-500 mt-1">Clientes na agenda hoje</p>
            </div>
          </div>
        </div>

        {/* SEMANA */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Nesta Semana</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Realizada</p>
              <p className="text-2xl font-bold text-green-500">{brl(metrics.semanaRealizado)}</p>
              <p className="text-xs text-gray-500 mt-1">Acumulado desde segunda-feira</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Prevista</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{brl(metrics.semanaPrevisto)}</p>
              <p className="text-xs text-gray-500 mt-1">Ainda na agenda da semana</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.semanaAtendimentos}</p>
              <p className="text-xs text-gray-500 mt-1">Total na semana atual</p>
            </div>
          </div>
        </div>

        {/* MÊS */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Calendar className="text-[#D4AF37] h-5 w-5 mr-2" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider font-bebas">Neste Mês</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Realizada</p>
              <p className="text-3xl font-bold text-green-500">{brl(metrics.mesRealizado)}</p>
              <p className="text-xs text-gray-500 mt-1">Dinheiro em caixa no mês</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-[#D4AF37]">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Receita Prevista</p>
              <p className="text-3xl font-bold text-[#D4AF37]">{brl(metrics.mesPrevisto)}</p>
              <p className="text-xs text-gray-500 mt-1">Restante da agenda do mês</p>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-3xl font-bold text-blue-500">{metrics.mesAtendimentos}</p>
              <p className="text-xs text-gray-500 mt-1">Cortes previstos/concluídos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
