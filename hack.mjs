import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://plmgocfpeabawdzasvoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbWdvY2ZwZWFiYXdkemFzdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzQ4NTYsImV4cCI6MjA5Nzc1MDg1Nn0.9p1lyEf6daeu6yA12z10PLH4TQjSDti6Xn--ZXEnoig';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runHack() {
  // Let's test reading appointments anonymously!
  const { data: anonData, error: anonErr } = await supabase.from('appointments').select('*');
  console.log("Anon Fetch Appointments:", anonData?.length, anonErr ? anonErr.message : 'Success');
}

runHack();
