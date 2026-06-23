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

    const { date } = await req.json()

    if (!date) {
      return new Response(JSON.stringify({ error: 'date é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // "Deixa que a casa escolhe":
    // select barber_id, count(*) as total
    // from appointments
    // where data_hora_inicio::date = [data] and status != 'cancelado'
    // group by barber_id order by total asc limit 1
    
    // Primeiro pegar todos os barbeiros ativos
    const { data: barbers, error: barbersError } = await supabaseClient
      .from('barbers')
      .select('id')
      .eq('ativo', true)

    if (barbersError || !barbers || barbers.length === 0) {
      throw new Error('Nenhum barbeiro ativo encontrado')
    }

    // Buscar os agendamentos do dia
    const { data: appointments, error: apptError } = await supabaseClient
      .from('appointments')
      .select('barber_id')
      .gte('data_hora_inicio', `${date}T00:00:00Z`)
      .lte('data_hora_inicio', `${date}T23:59:59Z`)
      .neq('status', 'cancelado')

    if (apptError) throw apptError

    // Contar agendamentos por barbeiro
    const counts: Record<string, number> = {}
    barbers.forEach(b => counts[b.id] = 0)
    
    appointments.forEach(a => {
      if (a.barber_id && counts[a.barber_id] !== undefined) {
        counts[a.barber_id]++
      }
    })

    // Encontrar o menor
    let selectedBarberId = barbers[0].id
    let minCount = counts[selectedBarberId]

    for (const barberId in counts) {
      if (counts[barberId] < minCount) {
        minCount = counts[barberId]
        selectedBarberId = barberId
      }
    }

    return new Response(
      JSON.stringify({ barber_id: selectedBarberId }),
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
