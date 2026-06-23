import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Calendar as CalIcon, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/admin/horarios')({
  component: HorariosAdmin,
})

function HorariosAdmin() {
  const { role } = Route.useRouteContext()
  const [bloqueios, setBloqueios] = useState<any[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [shopSettings, setShopSettings] = useState<any>(null)

  // Form State
  const [barberId, setBarberId] = useState('')
  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('00:00')
  const [horaFim, setHoraFim] = useState('23:59')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchData()
  }, [role])

  const fetchData = async () => {
    setLoading(true)
    const [barbersRes, bloqueiosRes, shopRes] = await Promise.all([
      supabase.from('barbers').select('*').eq('ativo', true).order('nome'),
      supabase.from('blocked_times').select('*, barbers(nome)').order('data', { ascending: false }),
      supabase.from('shop_settings').select('*').limit(1).single()
    ])
    
    if (barbersRes.data) setBarbers(barbersRes.data)
    if (bloqueiosRes.data) setBloqueios(bloqueiosRes.data)
    if (shopRes.data) setShopSettings(shopRes.data)
    
    setLoading(false)
  }

  const saveShopSettings = async () => {
    setLoading(true)
    const { error } = await supabase.from('shop_settings').update({
      horarios_por_dia: shopSettings.horarios_por_dia
    }).eq('id', shopSettings.id)
    
    if (error) toast.error('Erro ao salvar horários: ' + error.message)
    else toast.success('Horários de funcionamento atualizados!')
    
    setLoading(false)
  }

  const diasSemana = [
    { idx: '0', label: 'Domingo' },
    { idx: '1', label: 'Segunda-feira' },
    { idx: '2', label: 'Terça-feira' },
    { idx: '3', label: 'Quarta-feira' },
    { idx: '4', label: 'Quinta-feira' },
    { idx: '5', label: 'Sexta-feira' },
    { idx: '6', label: 'Sábado' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      barber_id: barberId,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      motivo
    }

    const { error } = await supabase.from('blocked_times').insert(payload)
    if (error) {
      toast.error('Erro ao bloquear horário: ' + error.message)
    } else {
      toast.success('Horário bloqueado com sucesso!')
      setIsModalOpen(false)
      resetForm()
      fetchData()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blocked_times').delete().eq('id', id)
    if (error) toast.error('Erro ao remover bloqueio: ' + error.message)
    else {
      toast.success('Bloqueio removido.')
      fetchData()
    }
  }

  const resetForm = () => {
    setBarberId(barbers[0]?.id || '')
    setData(new Date().toISOString().slice(0, 10))
    setHoraInicio('00:00')
    setHoraFim('23:59')
    setMotivo('')
  }

  if (loading && barbers.length === 0) return <div className="p-8">Carregando...</div>

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Horários e Bloqueios</h1>
          <p className="text-gray-400">Gerencie a disponibilidade da equipe</p>
        </div>
        
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Bloqueio
        </Button>
      </header>

      {shopSettings && shopSettings.horarios_por_dia && (
        <section className="bg-[#111] rounded-xl border border-[#222] p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-[#D4AF37]">Horários por Dia da Semana</h2>
          <div className="space-y-3">
            {diasSemana.map(dia => {
              const config = shopSettings.horarios_por_dia[dia.idx] || { abertura: '09:00', fechamento: '20:00', ativo: false };
              return (
                <div key={dia.idx} className={`flex items-center justify-between p-4 rounded-lg border transition ${config.ativo ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#333] bg-[#1A1A1A] opacity-70'}`}>
                  <div className="flex items-center gap-4 w-48">
                    <button 
                      onClick={() => {
                        const newConfig = { ...shopSettings.horarios_por_dia };
                        newConfig[dia.idx] = { ...config, ativo: !config.ativo };
                        setShopSettings({...shopSettings, horarios_por_dia: newConfig});
                      }}
                      className={`w-12 h-6 rounded-full relative transition-colors ${config.ativo ? 'bg-[#D4AF37]' : 'bg-[#333]'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${config.ativo ? 'left-7' : 'left-1'}`} />
                    </button>
                    <span className={`font-bold ${config.ativo ? 'text-white' : 'text-gray-500'}`}>{dia.label}</span>
                  </div>
                  
                  {config.ativo ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Abertura</span>
                        <Input 
                          type="time" 
                          value={config.abertura} 
                          onChange={(e) => {
                            const newConfig = { ...shopSettings.horarios_por_dia };
                            newConfig[dia.idx] = { ...config, abertura: e.target.value };
                            setShopSettings({...shopSettings, horarios_por_dia: newConfig});
                          }}
                          className="bg-black border-[#444] h-9 w-32 [color-scheme:dark]"
                        />
                      </div>
                      <span className="text-gray-500 mt-5">-</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Fechamento</span>
                        <Input 
                          type="time" 
                          value={config.fechamento} 
                          onChange={(e) => {
                            const newConfig = { ...shopSettings.horarios_por_dia };
                            newConfig[dia.idx] = { ...config, fechamento: e.target.value };
                            setShopSettings({...shopSettings, horarios_por_dia: newConfig});
                          }}
                          className="bg-black border-[#444] h-9 w-32 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider pr-10">Fechado</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={saveShopSettings} disabled={loading} className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">
              Salvar Configurações
            </Button>
          </div>
        </section>
      )}

      <h2 className="text-xl font-bold mb-4 text-[#D4AF37]">Bloqueios Manuais (Folgas / Almoço)</h2>
      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#1A1A1A] text-xs uppercase text-gray-400 border-b border-[#222]">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Horário</th>
              <th className="px-6 py-4">Barbeiro</th>
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {bloqueios.map(b => (
              <tr key={b.id} className="hover:bg-[#151515]">
                <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-[#D4AF37]" />
                  {format(parseISO(b.data), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" /> {b.hora_inicio.slice(0,5)} as {b.hora_fim.slice(0,5)}</span>
                </td>
                <td className="px-6 py-4 text-[#D4AF37] font-medium">{b.barbers?.nome}</td>
                <td className="px-6 py-4 text-gray-500">{b.motivo || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {bloqueios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum bloqueio cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">Bloquear Agenda</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-300">Barbeiro</Label>
                <select 
                  required 
                  value={barberId} 
                  onChange={e => setBarberId(e.target.value)} 
                  className="w-full mt-1 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-white outline-none focus:border-[#D4AF37]"
                >
                  <option value="" disabled>Selecione um barbeiro</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label className="text-gray-300">Data</Label>
                <Input required type="date" value={data} onChange={e => setData(e.target.value)} className="bg-[#1A1A1A] border-[#333] [color-scheme:dark]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Das</Label>
                  <Input required type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="bg-[#1A1A1A] border-[#333] [color-scheme:dark]" />
                </div>
                <div>
                  <Label className="text-gray-300">Até as</Label>
                  <Input required type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="bg-[#1A1A1A] border-[#333] [color-scheme:dark]" />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setHoraInicio('12:00'); setHoraFim('13:00'); setMotivo('Almoço'); }}
                  className="text-[#D4AF37] hover:text-[#B8972D] hover:bg-[#D4AF37]/10 h-8 px-2 text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Preencher Horário de Almoço
                </Button>
              </div>

              <div>
                <Label className="text-gray-300">Motivo (Opcional)</Label>
                <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Folga médica" className="bg-[#1A1A1A] border-[#333]" />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
