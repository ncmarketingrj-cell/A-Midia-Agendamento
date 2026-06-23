import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://plmgocfpeabawdzasvoi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbWdvY2ZwZWFiYXdkemFzdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzQ4NTYsImV4cCI6MjA5Nzc1MDg1Nn0.9p1lyEf6daeu6yA12z10PLH4TQjSDti6Xn--ZXEnoig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
