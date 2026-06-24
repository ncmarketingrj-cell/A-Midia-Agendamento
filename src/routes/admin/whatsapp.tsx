import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Smartphone, Link as LinkIcon, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/whatsapp')({
  component: WhatsappAdmin,
})

function WhatsappAdmin() {
  const [loading, setLoading] = useState(true)
  const [shopSettingsId, setShopSettingsId] = useState<string>('')
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  
  // Instance State
  const [instanceState, setInstanceState] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED')
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const instanceName = 'MidiaBarbearia'

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('shop_secrets').select('id, wpp_api_url, wpp_api_key').limit(1).maybeSingle()
    if (data) {
      setShopSettingsId(data.id)
      setApiUrl(data.wpp_api_url || '')
      setApiKey(data.wpp_api_key || '')
      
      if (data.wpp_api_url && data.wpp_api_key) {
        checkStatus(data.wpp_api_url, data.wpp_api_key)
      }
    }
    setLoading(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Format URL (remove trailing slash)
    const cleanUrl = apiUrl.trim().replace(/\/$/, '')
    setApiUrl(cleanUrl)

    let error;
    if (shopSettingsId) {
      const res = await supabase.from('shop_secrets').update({
        wpp_api_url: cleanUrl,
        wpp_api_key: apiKey.trim()
      }).eq('id', shopSettingsId)
      error = res.error;
    } else {
      const res = await supabase.from('shop_secrets').insert({
        wpp_api_url: cleanUrl,
        wpp_api_key: apiKey.trim()
      }).select().single()
      error = res.error;
      if (res.data) setShopSettingsId(res.data.id);
    }

    if (error) {
      toast.error('Erro ao salvar credenciais: ' + error.message)
    } else {
      toast.success('Credenciais salvas com sucesso no Cofre!')
      checkStatus(cleanUrl, apiKey.trim())
    }
    setLoading(false)
  }

  const checkStatus = async (url: string, key: string) => {
    if (!url || !key) return
    setIsChecking(true)
    try {
      const res = await fetch(`${url}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': key }
      })
      
      if (!res.ok) {
        // If 404, instance doesn't exist yet, we can create it
        if (res.status === 404) {
          setInstanceState('DISCONNECTED')
          setQrCodeBase64(null)
          return
        }
        throw new Error('Erro ao checar status')
      }

      const data = await res.json()
      const state = data?.instance?.state || data?.state
      
      if (state === 'open' || state === 'CONNECTED') {
        setInstanceState('CONNECTED')
        setQrCodeBase64(null)
      } else {
        setInstanceState('DISCONNECTED')
      }
    } catch (err) {
      console.error(err)
      setInstanceState('DISCONNECTED')
    } finally {
      setIsChecking(false)
    }
  }

  const handleGenerateQR = async () => {
    if (!apiUrl || !apiKey) {
      toast.error('Salve a URL e a Senha primeiro!')
      return
    }
    setIsChecking(true)
    try {
      // 1. Try to create instance (if it already exists, Evolution returns error but it's fine)
      await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      }).catch(() => {})

      // 2. Fetch QR Code
      const res = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: { 'apikey': apiKey }
      })
      
      const data = await res.json()
      
      if (data.base64) {
        setQrCodeBase64(data.base64)
        setInstanceState('CONNECTING')
        toast.success('QR Code gerado! Leia com o WhatsApp.')
      } else if (data.instance?.state === 'open') {
        setInstanceState('CONNECTED')
        toast.success('Já está conectado!')
      } else {
        throw new Error('Falha ao obter QR Code')
      }

    } catch (err: any) {
      toast.error('Erro ao gerar QR Code: Verifique as credenciais. ' + err.message)
    } finally {
      setIsChecking(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
    setIsChecking(true)
    try {
      await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey }
      })
      setInstanceState('DISCONNECTED')
      setQrCodeBase64(null)
      toast.success('WhatsApp desconectado com sucesso.')
    } catch (err) {
      toast.error('Erro ao desconectar.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto min-h-screen">
      <header className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Smartphone className="h-8 w-8 text-[#D4AF37]" /> Conexão WhatsApp
        </h1>
        <p className="text-gray-400 mt-1">Vincule o aparelho da barbearia para disparar mensagens automáticas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Painel Esquerdo: Credenciais */}
        <section className="bg-[#111] rounded-xl border border-[#222] p-6 h-fit">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-[#D4AF37]" /> Configurações do Servidor
          </h2>
          <p className="text-sm text-gray-400 mb-6">Insira os dados gerados pelo Evolution API no Railway.</p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <Label className="text-gray-300">URL do Servidor (Evolution API)</Label>
              <Input 
                required 
                value={apiUrl} 
                onChange={e => setApiUrl(e.target.value)} 
                placeholder="Ex: https://evolution-api-production.up.railway.app"
                className="bg-[#1A1A1A] border-[#333] text-white mt-1" 
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Global API Key (Senha)</Label>
              <Input 
                required 
                type="password"
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="Coloque aqui a API Key"
                className="bg-[#1A1A1A] border-[#333] text-white mt-1" 
              />
            </div>
            
            <Button type="submit" disabled={loading} className="w-full bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-white font-bold">
              Salvar Credenciais
            </Button>
          </form>
        </section>

        {/* Painel Direito: Aparelho / QR Code */}
        <section className="bg-[#111] rounded-xl border border-[#222] p-6 flex flex-col items-center justify-center min-h-[400px]">
          {(!apiUrl || !apiKey) ? (
            <div className="text-center text-gray-500">
              <ShieldCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Configure as credenciais ao lado primeiro.</p>
            </div>
          ) : (
            <div className="w-full text-center flex flex-col items-center">
              
              {instanceState === 'CONNECTED' && (
                <>
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">WhatsApp Conectado!</h2>
                  <p className="text-gray-400 mb-8 max-w-sm text-center">
                    Seu motor está pronto. Os agendamentos novos receberão confirmações automáticas em tempo real.
                  </p>
                  <Button onClick={handleLogout} disabled={isChecking} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                    Desconectar Aparelho
                  </Button>
                </>
              )}

              {instanceState === 'DISCONNECTED' && !qrCodeBase64 && (
                <>
                  <div className="w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-10 w-10 text-gray-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Pronto para Conectar</h2>
                  <p className="text-gray-400 mb-8 max-w-sm text-center">
                    Gere o QR Code e leia com o WhatsApp do aparelho da barbearia (Aparelhos Conectados).
                  </p>
                  <Button onClick={handleGenerateQR} disabled={isChecking} className="bg-[#D4AF37] hover:bg-[#B8972D] text-black font-bold w-full max-w-xs">
                    {isChecking ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                    Gerar QR Code
                  </Button>
                </>
              )}

              {qrCodeBase64 && instanceState !== 'CONNECTED' && (
                <>
                  <h2 className="text-xl font-bold text-white mb-4">Leia o QR Code</h2>
                  <div className="bg-white p-4 rounded-xl mb-6">
                    <img src={qrCodeBase64} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => checkStatus(apiUrl, apiKey)} disabled={isChecking} className="bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-white">
                      {isChecking ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      Já li o código
                    </Button>
                    <Button onClick={handleGenerateQR} disabled={isChecking} variant="ghost" className="text-gray-400 hover:text-white">
                      Gerar Novo
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
