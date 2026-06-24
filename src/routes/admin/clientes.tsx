import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Plus, UserCheck, TrendingUp, Users, Scissors, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/admin/clientes')({
  component: ClientesAdmin,
})

type Client = {
  id: string
  nome: string
  telefone: string
  total_agendamentos: number
  ultimo_agendamento: string | null
  barber_id: string | null
  created_at: string
  barbers?: { nome: string } | null
}

function ClientesAdmin() {
  const { role } = Route.useRouteContext()
  const [clientes, setClientes] = useState<Client[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [clientBarberId, setClientBarberId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [clientesRes, barbersRes] = await Promise.all([
      supabase.from('clients').select('*, barbers(nome)').order('ultimo_agendamento', { ascending: false, nullsFirst: false }),
      supabase.from('barbers').select('id, nome').eq('ativo', true)
    ])
    
    if (clientesRes.data) setClientes(clientesRes.data)
    if (barbersRes.data) setBarbers(barbersRes.data)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = { 
      nome, 
      telefone, 
      barber_id: clientBarberId || null 
    }

    if (editId) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editId)
      if (error) toast.error('Erro ao editar: ' + error.message)
      else toast.success('Cliente atualizado!')
    } else {
      const { error } = await supabase.from('clients').insert([{
        ...payload,
        total_agendamentos: 0,
        ultimo_agendamento: new Date().toISOString()
      }])
      if (error) {
        if (error.code === '23505') toast.error('Já existe um cliente com este telefone.')
        else toast.error('Erro ao cadastrar: ' + error.message)
      } else {
        toast.success('Cliente cadastrado!')
      }
    }
    
    setIsModalOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esse cliente? Isso não apagará os agendamentos dele, apenas removerá do CRM.')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Cliente excluído do CRM.')
      fetchData()
    }
  }

  const openEdit = (c: Client) => {
    setEditId(c.id)
    setNome(c.nome)
    setTelefone(c.telefone)
    setClientBarberId(c.barber_id || '')
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditId(null)
    setNome('')
    setTelefone('')
    setClientBarberId('')
  }

  const filteredClientes = clientes.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.telefone.includes(search)
    const matchBarber = filterBarber === 'all' ? true : c.barber_id === filterBarber
    return matchSearch && matchBarber
  })

  // Metrics
  const totalClientes = filteredClientes.length
  const topClientes = [...filteredClientes].sort((a, b) => b.total_agendamentos - a.total_agendamentos).slice(0, 5)
  const mesAtual = new Date().getMonth()
  const novosEsteMes = filteredClientes.filter(c => new Date(c.created_at).getMonth() === mesAtual).length

  return (
    <main className="flex-1 p-8 overflow-y-auto min-h-screen">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-[#D4AF37]" /> CRM de Clientes
          </h1>
          <p className="text-gray-400 mt-1">Gerencie sua cartela, fidelize e acompanhe o retorno.</p>
        </div>
        
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente Manual
        </Button>
      </header>

      {/* Dashboard / Termômetro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111] rounded-xl border border-[#222] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Total na Base</h3>
          </div>
          <p className="text-3xl font-bold font-display">{totalClientes}</p>
        </div>
        
        <div className="bg-[#111] rounded-xl border border-[#222] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Novos este Mês</h3>
          </div>
          <p className="text-3xl font-bold font-display text-green-400">+{novosEsteMes}</p>
        </div>

        <div className="bg-[#111] rounded-xl border border-[#222] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Média de Retorno</h3>
          </div>
          <p className="text-3xl font-bold font-display">
            {totalClientes > 0 ? (filteredClientes.reduce((acc, c) => acc + c.total_agendamentos, 0) / totalClientes).toFixed(1) : '0'} <span className="text-sm font-normal text-gray-500">cortes/cliente</span>
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Buscar por nome ou telefone..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[#111] border-[#222] text-white w-full"
          />
        </div>
        
        {role === 'admin' && (
          <select 
            value={filterBarber}
            onChange={e => setFilterBarber(e.target.value)}
            className="bg-[#111] border border-[#222] rounded-md px-3 text-white outline-none w-full md:w-48 h-10"
          >
            <option value="all">Todos os Barbeiros</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de Clientes */}
      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-[#1A1A1A] text-xs uppercase text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4 text-center">Cortes Realizados</th>
                <th className="px-6 py-4">Última Visita</th>
                <th className="px-6 py-4">Barbeiro Fiel</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredClientes.map(c => {
                const isTop = topClientes.some(t => t.id === c.id) && c.total_agendamentos > 1;
                return (
                  <tr key={c.id} className="hover:bg-[#151515] transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2 whitespace-nowrap">
                      {isTop && <span title="Top Cliente" className="text-[#D4AF37]">⭐</span>}
                      {c.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{c.telefone}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-[#1A1A1A] border border-[#333] rounded-full w-8 h-8 font-bold text-[#D4AF37]">
                        {c.total_agendamentos}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {c.ultimo_agendamento ? format(parseISO(c.ultimo_agendamento), 'dd/MM/yyyy') : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 flex items-center gap-2">
                      {c.barbers?.nome ? (
                        <><Scissors className="w-3 h-3" /> {c.barbers.nome}</>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 w-8 h-8 mr-1">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {role === 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 w-8 h-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredClientes.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-300">Nome do Cliente</Label>
                <Input 
                  required 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: João Silva"
                  className="bg-[#1A1A1A] border-[#333] text-white mt-1" 
                />
              </div>
              
              <div>
                <Label className="text-gray-300">WhatsApp</Label>
                <Input 
                  required 
                  value={telefone} 
                  onChange={e => setTelefone(e.target.value)} 
                  placeholder="(21) 99999-9999"
                  className="bg-[#1A1A1A] border-[#333] text-white mt-1" 
                />
              </div>

              <div>
                <Label className="text-gray-300">Barbeiro Fiel (Opcional)</Label>
                <select 
                  value={clientBarberId}
                  onChange={e => setClientBarberId(e.target.value)}
                  className="w-full mt-1 bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-white outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Sem barbeiro fixo</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Selecione se este cliente costuma cortar sempre com o mesmo profissional.</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 border-[#333] text-white hover:bg-[#1A1A1A]">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
