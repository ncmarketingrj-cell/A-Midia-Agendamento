import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit2, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useOutletContext } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/barbeiros')({
  component: BarbeirosAdmin,
})

export type Barber = {
  id: string
  nome: string
  foto_url: string
  especialidade: string
  comissao_percentual: number
  ativo: boolean
  barber_services?: { service_id: string }[]
}

export type Service = {
  id: string
  nome: string
}

function BarbeirosAdmin() {
  const { role } = Route.useRouteContext()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [comissao, setComissao] = useState(50)
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchData()
  }, [role])

  const fetchData = async () => {
    setLoading(true)
    const [barbersRes, servicesRes] = await Promise.all([
      supabase.from('barbers').select('*, barber_services(service_id)').order('nome'),
      supabase.from('services').select('id, nome').order('nome')
    ])
    
    if (barbersRes.error) {
      toast.error('Erro ao buscar barbeiros: ' + barbersRes.error.message)
    } else {
      setBarbers(barbersRes.data || [])
    }
    
    if (servicesRes.data) setServices(servicesRes.data)
    
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    let finalFotoUrl = fotoUrl || 'https://i.pravatar.cc/300';
    
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { data, error } = await supabase.storage.from('barber-photos').upload(filename, fotoFile);
      if (error) {
        toast.error('Erro ao subir foto: ' + error.message);
        setLoading(false);
        return;
      }
      const { data: publicData } = supabase.storage.from('barber-photos').getPublicUrl(filename);
      finalFotoUrl = publicData.publicUrl;
    }

    const payload = {
      nome,
      especialidade,
      foto_url: finalFotoUrl,
      comissao_percentual: comissao,
      ativo: true
    }

    let savedBarberId = editingId;

    if (editingId) {
      const { error } = await supabase.from('barbers').update(payload).eq('id', editingId)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); setLoading(false); return; }
      else toast.success('Barbeiro atualizado!')
    } else {
      const { data, error } = await supabase.from('barbers').insert(payload).select().single()
      if (error) { toast.error('Erro ao cadastrar: ' + error.message); setLoading(false); return; }
      else {
        toast.success('Barbeiro cadastrado com sucesso!')
        savedBarberId = data.id
      }
    }

    if (savedBarberId) {
      // Sync barber_services
      await supabase.from('barber_services').delete().eq('barber_id', savedBarberId)
      if (selectedServices.length > 0) {
        const servicesPayload = selectedServices.map(sid => ({ barber_id: savedBarberId, service_id: sid }))
        await supabase.from('barber_services').insert(servicesPayload)
      }
    }

    setIsModalOpen(false)
    resetForm()
    fetchData()
  }

  const toggleAtivo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('barbers').update({ ativo: !currentStatus }).eq('id', id)
    if (error) toast.error('Erro ao alterar status: ' + error.message)
    else {
      toast.success(currentStatus ? 'Barbeiro pausado.' : 'Barbeiro ativado.')
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este barbeiro e seu histórico de agendamentos?')) return;
    const { error } = await supabase.from('barbers').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Barbeiro excluído com sucesso.')
      fetchData()
    }
  }

  const resetForm = () => {
    setNome('')
    setEspecialidade('')
    setFotoUrl('')
    setFotoFile(null)
    setComissao(50)
    setSelectedServices(services.map(s => s.id)) // Por padrão todos
    setEditingId(null)
  }

  const openEdit = (b: Barber) => {
    setNome(b.nome)
    setEspecialidade(b.especialidade)
    setFotoUrl(b.foto_url)
    setFotoFile(null)
    setComissao(b.comissao_percentual)
    setSelectedServices(b.barber_services?.map(s => s.service_id) || [])
    setEditingId(b.id)
    setIsModalOpen(true)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Barbeiros</h1>
          <p className="text-gray-400">Adicione e remova profissionais</p>
        </div>
        
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Barbeiro
        </Button>
      </header>

      <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#1A1A1A] text-xs uppercase text-gray-400 border-b border-[#222]">
            <tr>
              <th className="px-6 py-4">Profissional</th>
              <th className="px-6 py-4">Especialidade</th>
              <th className="px-6 py-4 text-center">Comissão</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {barbers.map(b => (
              <tr key={b.id} className="hover:bg-[#151515]">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={b.foto_url} alt={b.nome} className="w-10 h-10 rounded-full border border-[#D4AF37]/30 object-cover" />
                  <span className="font-bold text-white">{b.nome}</span>
                </td>
                <td className="px-6 py-4">{b.especialidade}</td>
                <td className="px-6 py-4 text-center font-bold text-[#D4AF37]">{b.comissao_percentual}%</td>
                <td className="px-6 py-4 text-center">
                  {b.ativo ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full" title="Oculto no app público">
                      <Clock className="w-3 h-3" /> Pausado
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="text-gray-400 hover:text-white" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleAtivo(b.id, b.ativo)} className={b.ativo ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" : "text-green-400 hover:text-green-300 hover:bg-green-400/10"} title={b.ativo ? "Pausar" : "Ativar"}>
                    {b.ativo ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Excluir Definitivamente">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {barbers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum barbeiro cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo'} Barbeiro</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-300">Nome</Label>
                <Input required value={nome} onChange={e => setNome(e.target.value)} className="bg-[#1A1A1A] border-[#333]" />
              </div>
              <div>
                <Label className="text-gray-300">Especialidade (ex: Degradê e Navalha)</Label>
                <Input required value={especialidade} onChange={e => setEspecialidade(e.target.value)} className="bg-[#1A1A1A] border-[#333]" />
              </div>
              <div>
                <Label className="text-gray-300">Foto (JPG/PNG)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <img src={fotoFile ? URL.createObjectURL(fotoFile) : (fotoUrl || 'https://i.pravatar.cc/300')} alt="Preview" className="w-14 h-14 rounded-full object-cover border border-[#333]" />
                  <Input type="file" accept="image/*" onChange={e => setFotoFile(e.target.files?.[0] || null)} className="bg-[#1A1A1A] border-[#333] text-gray-300 cursor-pointer" />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Comissão (%)</Label>
                <Input required type="number" min="0" max="100" value={comissao} onChange={e => setComissao(Number(e.target.value))} className="bg-[#1A1A1A] border-[#333]" />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Serviços Executados</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#1A1A1A] border border-[#333] rounded-md">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedServices.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedServices([...selectedServices, s.id])
                          else setSelectedServices(selectedServices.filter(id => id !== s.id))
                        }}
                        className="accent-[#D4AF37]"
                      />
                      {s.nome}
                    </label>
                  ))}
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
