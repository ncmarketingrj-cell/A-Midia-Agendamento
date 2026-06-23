import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, barber_id, nome } = await req.json()

    if (!email || !password || !barber_id) {
      throw new Error('Email, password, and barber_id are required')
    }

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: nome }
    })

    if (authError) {
      throw authError
    }

    const userId = authData.user.id

    // 2. Insert into admin_users mapped to barber_id
    const { error: dbError } = await supabaseClient.from('admin_users').insert({
      id: userId,
      nome: nome,
      role: 'barbeiro',
      barber_id: barber_id
    })

    if (dbError) {
      // If failed, we should probably delete the auth user to keep consistency, but leaving it for now
      throw dbError
    }

    return new Response(
      JSON.stringify({ message: 'Barber login created successfully', userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
