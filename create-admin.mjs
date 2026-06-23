import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://plmgocfpeabawdzasvoi.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'ey...'; // I need the actual anon key!

// Wait, I can just fetch the anon key using the CLI:
// `npx supabase status` -> wait, this is only for local dev.
// How do I get the remote anon key?
// I can't get the remote anon key automatically via CLI unless I use `npx supabase inspect`.
