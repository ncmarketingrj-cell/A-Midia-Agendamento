import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useOutletContext } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/barbeiros')({
  component: BarbeirosAdmin,
})

type Barber = {
  id: string
  nome: string
  foto_url: string
  especialidade: string
  comissao_percentual: number
  ativo: boolean
}

function BarbeirosAdmin() {
  const { role } = Route.useRouteContext()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [comissao, setComissao] = useState(50)

  useEffect(() => {
    if (role !== 'admin') {
      window.location.href = '/admin'
      return
    }
    fetchBarbers()
  }, [role])

  const fetchBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .order('nome')
    
    if (error) {
      toast.error('Erro ao buscar barbeiros: ' + error.message)
    } else {
      setBarbers(data || [])
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      nome,
      especialidade,
      foto_url: fotoUrl || 'https://i.pravatar.cc/300', // Foto padrão
      comissao_percentual: comissao,
      ativo: true
    }

    if (editingId) {
      const { error } = await supabase.from('barbers').update(payload).eq('id', editingId)
      if (error) toast.error('Erro ao atualizar: ' + error.message)
      else toast.success('Barbeiro atualizado!')
    } else {
      const { error } = await supabase.from('barbers').insert(payload)
      if (error) toast.error('Erro ao cadastrar: ' + error.message)
      else toast.success('Barbeiro cadastrado com sucesso!')
    }

    setIsModalOpen(false)
    resetForm()
    fetchBarbers()
  }

  const toggleAtivo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('barbers').update({ ativo: !currentStatus }).eq('id', id)
    if (error) toast.error('Erro ao alterar status: ' + error.message)
    else {
      toast.success(currentStatus ? 'Barbeiro inativado.' : 'Barbeiro ativado.')
      fetchBarbers()
    }
  }

  const resetForm = () => {
    setNome('')
    setEspecialidade('')
    setFotoUrl('')
    setComissao(50)
    setEditingId(null)
  }

  const openEdit = (b: Barber) => {
    setNome(b.nome)
    setEspecialidade(b.especialidade)
    setFotoUrl(b.foto_url)
    setComissao(b.comissao_percentual)
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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                      <X className="w-3 h-3" /> Inativo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="text-gray-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleAtivo(b.id, b.ativo)} className={b.ativo ? "text-red-400 hover:text-red-300 hover:bg-red-400/10" : "text-green-400 hover:text-green-300 hover:bg-green-400/10"}>
                    {b.ativo ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
                <Label className="text-gray-300">URL da Foto (opcional)</Label>
                <Input value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} className="bg-[#1A1A1A] border-[#333]" />
              </div>
              <div>
                <Label className="text-gray-300">Comissão (%)</Label>
                <Input required type="number" min="0" max="100" value={comissao} onChange={e => setComissao(Number(e.target.value))} className="bg-[#1A1A1A] border-[#333]" />
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
