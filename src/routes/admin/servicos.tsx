import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/admin/servicos')({
  component: ServicosAdmin,
})

type Service = {
  id: string
  nome: string
  descricao: string
  duracao_minutos: number
  preco: number
  ativo: boolean
}

function ServicosAdmin() {
  const { role } = Route.useRouteContext()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [duracao, setDuracao] = useState(30)
  const [preco, setPreco] = useState(0)

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchServices()
    
    // Auto-Force Sync as requested by user
    const forceSync = async () => {
      const syncDone = localStorage.getItem('force_sync_services_v4'); // Updated version
      if (!syncDone) {
        toast.info("Sincronizando tabela de serviços automaticamente...", { duration: 5000 });
        try {
          const newServices = [
            { nome: 'Cabelo + Barba', preco: 60, duracao_minutos: 60, ativo: true },
            { nome: 'Corte Máquina', preco: 35, duracao_minutos: 30, ativo: true },
            { nome: 'Corte Máquina e Tesoura', preco: 40, duracao_minutos: 40, ativo: true },
            { nome: 'Pigmentação', preco: 20, duracao_minutos: 30, ativo: true },
            { nome: 'Corte + Pigmentação', preco: 60, duracao_minutos: 60, ativo: true },
            { nome: 'Barba', preco: 25, duracao_minutos: 30, ativo: true },
            { nome: 'Corte Reflexo', preco: 80, duracao_minutos: 90, ativo: true },
            { nome: 'Sobrancelha', preco: 15, duracao_minutos: 15, ativo: true },
            { nome: 'Pezinho', preco: 10, duracao_minutos: 15, ativo: true },
            { nome: 'Corte Completo (Máq/Tes/Nav)', preco: 45, duracao_minutos: 50, ativo: true }
          ];

          // 1. Apagar vinculos antigos
          await supabase.from('barber_services').delete().neq('service_id', '00000000-0000-0000-0000-000000000000');
          // 2. Ocultar servicos antigos (soft delete) para evitar erro de Foreign Key
          await supabase.from('services').update({ ativo: false }).neq('id', '00000000-0000-0000-0000-000000000000');
          
          // 3. Inserir novos
          const { error } = await supabase.from('services').insert(newServices);
          if (error) throw error;

          // 4. Vincular todos os novos aos barbeiros ativos
          const { data: activeServices } = await supabase.from('services').select('id').eq('ativo', true);
          const { data: barbers } = await supabase.from('barbers').select('id').eq('ativo', true);
          if (activeServices && barbers) {
            for (const b of barbers) {
              const links = activeServices.map(as => ({ barber_id: b.id, service_id: as.id }));
              await supabase.from('barber_services').insert(links);
            }
          }
          
          localStorage.setItem('force_sync_services_v4', 'true');
          toast.success("Tabela de serviços atualizada com sucesso!");
          fetchServices();
        } catch (e: any) {
          console.error(e);
          toast.error("Erro no auto-sync: " + e.message);
        }
      }
    };
    forceSync();
  }, [role])

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('ativo', true) // Only fetch active services so "deleted" ones vanish
      .order('nome')
    
    if (error) {
      toast.error('Erro ao buscar serviços: ' + error.message)
    } else {
      setServices(data || [])
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      nome,
      duracao_minutos: duracao,
      preco,
      ativo: true
    }

    if (editingId) {
      const { error } = await supabase.from('services').update(payload).eq('id', editingId)
      if (error) toast.error('Erro ao atualizar: ' + error.message)
      else toast.success('Serviço atualizado!')
    } else {
      const { data, error } = await supabase.from('services').insert(payload).select().single()
      if (error) toast.error('Erro ao cadastrar: ' + error.message)
      else {
        toast.success('Serviço criado com sucesso!')
        // Vínculo automático aos barbeiros ativos para aparecer na página pública
        if (data?.id) {
          const { data: barbers } = await supabase.from('barbers').select('id').eq('ativo', true);
          if (barbers && barbers.length > 0) {
            const links = barbers.map(b => ({ barber_id: b.id, service_id: data.id }));
            await supabase.from('barber_services').insert(links);
          }
        }
      }
    }

    setIsModalOpen(false)
    resetForm()
    fetchServices()
  }

  const toggleAtivo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('services').update({ ativo: !currentStatus }).eq('id', id)
    if (error) toast.error('Erro ao alterar status: ' + error.message)
    else {
      toast.success(currentStatus ? 'Serviço inativado.' : 'Serviço ativado.')
      fetchServices()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este serviço da lista?')) return;
    
    // Soft delete to avoid FK constraints but completely hide it from the admin UI
    const { error } = await supabase.from('services').update({ ativo: false }).eq('id', id);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
    } else {
      toast.success('Serviço removido com sucesso!');
      fetchServices();
    }
  }

  const resetForm = () => {
    setNome('')
    setDescricao('')
    setDuracao(30)
    setPreco(0)
    setEditingId(null)
  }

  const openEdit = (s: Service) => {
    setNome(s.nome)
    setDescricao(s.descricao || '')
    setDuracao(s.duracao_minutos)
    setPreco(s.preco)
    setEditingId(s.id)
    setIsModalOpen(true)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Serviços</h1>
          <p className="text-gray-400">Controle o cardápio da barbearia</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </header>

      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300 min-w-[600px]">
            <thead className="bg-[#1A1A1A] text-xs uppercase text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Duração</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-[#151515]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-white">{s.nome}</div>
                    <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">{s.descricao}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{s.duracao_minutos} min</td>
                  <td className="px-6 py-4 font-bold text-[#D4AF37] whitespace-nowrap">
                    {s.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {s.ativo ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                        <X className="w-3 h-3" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="text-gray-400 hover:text-white" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum serviço cadastrado.
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
            <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo'} Serviço</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-300">Nome do Serviço</Label>
                <Input required value={nome} onChange={e => setNome(e.target.value)} className="bg-[#1A1A1A] border-[#333]" />
              </div>
              <div>
                <Label className="text-gray-300">Descrição</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="bg-[#1A1A1A] border-[#333] resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Duração (minutos)</Label>
                  <Input required type="number" min="5" step="5" value={duracao} onChange={e => setDuracao(Number(e.target.value))} className="bg-[#1A1A1A] border-[#333]" />
                </div>
                <div>
                  <Label className="text-gray-300">Preço (R$)</Label>
                  <Input required type="number" min="0" step="0.01" value={preco} onChange={e => setPreco(Number(e.target.value))} className="bg-[#1A1A1A] border-[#333]" />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 border-[#333] text-white">Cancelar</Button>
                <Button type="submit" className="flex-1 bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
