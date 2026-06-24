import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/mensagens')({
  component: MensagensAdmin,
})

type Template = {
  id: string
  titulo: string
  texto: string
}

function MensagensAdmin() {
  const { role } = Route.useRouteContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [editId, setEditId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('message_templates').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Erro ao carregar templates: ' + error.message)
    } else if (data) {
      setTemplates(data)
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = { titulo, texto }

    if (editId) {
      const { error } = await supabase.from('message_templates').update(payload).eq('id', editId)
      if (error) toast.error('Erro ao editar: ' + error.message)
      else toast.success('Template atualizado!')
    } else {
      const { error } = await supabase.from('message_templates').insert(payload)
      if (error) toast.error('Erro ao criar: ' + error.message)
      else toast.success('Template criado!')
    }
    
    setIsModalOpen(false)
    resetForm()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esse template?')) return
    const { error } = await supabase.from('message_templates').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Template excluído.')
      fetchData()
    }
  }

  const openEdit = (t: Template) => {
    setEditId(t.id)
    setTitulo(t.titulo)
    setTexto(t.texto)
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditId(null)
    setTitulo('')
    setTexto('')
  }

  const insertVariable = (variable: string) => {
    setTexto(prev => prev + variable)
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto min-h-screen">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-[#D4AF37]" /> Mensagens Rápidas
          </h1>
          <p className="text-gray-400 mt-1">Crie textos para enviar no WhatsApp dos clientes com 1 clique.</p>
        </div>
        
        {role === 'admin' && (
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Template
          </Button>
        )}
      </header>

      {loading && templates.length === 0 ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="bg-[#111] rounded-xl border border-[#222] p-5 flex flex-col h-full hover:border-[#D4AF37]/50 transition-colors">
              <h3 className="text-lg font-bold text-white mb-2">{t.titulo}</h3>
              <div className="bg-[#1A1A1A] rounded-md p-3 mb-4 text-sm text-gray-300 flex-1 whitespace-pre-wrap border border-[#333]">
                {t.texto}
              </div>
              {role === 'admin' && (
                <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-[#222]">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Nenhum template cadastrado. Clique no botão acima para criar o primeiro.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#111] border border-[#222] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-white">{editId ? 'Editar Template' : 'Novo Template'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-300">Título (só para você identificar)</Label>
                <Input 
                  required 
                  value={titulo} 
                  onChange={e => setTitulo(e.target.value)} 
                  placeholder="Ex: Lembrete de Horário"
                  className="bg-[#1A1A1A] border-[#333] text-white mt-1" 
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Texto da Mensagem</Label>
                <div className="flex flex-wrap gap-2 my-2">
                  <span className="text-xs text-gray-500 mr-2 self-center">Variáveis:</span>
                  <button type="button" onClick={() => insertVariable('[NOME_CLIENTE]')} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded hover:bg-[#D4AF37]/40">[NOME_CLIENTE]</button>
                  <button type="button" onClick={() => insertVariable('[SERVICO]')} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded hover:bg-[#D4AF37]/40">[SERVICO]</button>
                  <button type="button" onClick={() => insertVariable('[HORA]')} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded hover:bg-[#D4AF37]/40">[HORA]</button>
                  <button type="button" onClick={() => insertVariable('[DATA]')} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded hover:bg-[#D4AF37]/40">[DATA]</button>
                  <button type="button" onClick={() => insertVariable('[BARBEIRO]')} className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded hover:bg-[#D4AF37]/40">[BARBEIRO]</button>
                </div>
                <Textarea 
                  required 
                  value={texto} 
                  onChange={e => setTexto(e.target.value)} 
                  rows={6}
                  placeholder="Olá [NOME_CLIENTE]..."
                  className="bg-[#1A1A1A] border-[#333] text-white resize-none" 
                />
                <p className="text-xs text-gray-500 mt-2">Dica: O sistema vai substituir as palavras entre colchetes automaticamente na hora de enviar.</p>
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
