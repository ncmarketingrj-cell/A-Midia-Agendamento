import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:/Anty - Lovable - A Midia Barbearia/.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: serv, error: e1 } = await supabase.from('services').select('*').limit(1)
  console.log("Services:", serv, e1?.message)

  const { data: blk, error: e2 } = await supabase.from('blocked_times').select('*').limit(1)
  console.log("Blocked:", blk, e2?.message)
}
run()
