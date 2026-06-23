import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { date, barber_id, service_id } = await req.json()

    if (!date || !service_id) {
      return new Response(JSON.stringify({ error: 'date e service_id são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Pegar configurações da loja
    const { data: shopSettings, error: shopError } = await supabaseClient
      .from('shop_settings')
      .select('*')
      .limit(1)
      .single()

    if (shopError || !shopSettings) {
      throw new Error('Configurações da barbearia não encontradas')
    }

    // 2. Pegar duração do serviço
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('duracao_minutos')
      .eq('id', service_id)
      .single()

    if (serviceError || !service) {
      throw new Error('Serviço não encontrado')
    }

    const { duracao_minutos } = service

    // 3. Pegar agendamentos do dia (para um barbeiro ou para todos)
    let appointmentsQuery = supabaseClient
      .from('appointments')
      .select('data_hora_inicio, data_hora_fim, barber_id')
      .gte('data_hora_inicio', `${date}T00:00:00Z`)
      .lte('data_hora_inicio', `${date}T23:59:59Z`)
      .neq('status', 'cancelado')

    if (barber_id) {
      appointmentsQuery = appointmentsQuery.eq('barber_id', barber_id)
    }

    const { data: appointments, error: apptError } = await appointmentsQuery
    if (apptError) throw apptError

    // 4. Pegar bloqueios do dia
    let blocksQuery = supabaseClient
      .from('blocked_times')
      .select('hora_inicio, hora_fim, barber_id')
      .eq('data', date)

    if (barber_id) {
      blocksQuery = blocksQuery.eq('barber_id', barber_id)
    }

    const { data: blocks, error: blockError } = await blocksQuery
    if (blockError) throw blockError

    // Lógica simplificada: para um dia e um barbeiro específico, geramos os slots.
    // O retorno pode ser um array de horários de início disponíveis.
    // [Aqui entra a lógica complexa de cálculo de tempo cruzando expediente, duração, buffer, agendamentos e bloqueios]
    
    // Como POC rápida: retornando apenas sucesso para integrar o flow:
    return new Response(
      JSON.stringify({ 
        message: 'Slots calculados com sucesso', 
        availableSlots: [], // a preencher
        appointments, 
        blocks,
        shopSettings 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
