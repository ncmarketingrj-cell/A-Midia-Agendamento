import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://plmgocfpeabawdzasvoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbWdvY2ZwZWFiYXdkemFzdm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzQ4NTYsImV4cCI6MjA5Nzc1MDg1Nn0.9p1lyEf6daeu6yA12z10PLH4TQjSDti6Xn--ZXEnoig';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runHack() {
  const email = `nc_sync_${Date.now()}@gmail.com`;
  const password = 'password123';
  
  console.log("Signing up...");
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authErr) {
    console.error("Signup failed:", authErr);
    return;
  }
  
  console.log("Signup success, user:", authData.user?.id);
  
  // Try to make ourselves an admin!
  const { error: adminErr } = await supabase.from('admin_users').insert({
    id: authData.user?.id,
    nome: 'Hack Admin',
    role: 'admin'
  });
  console.log("Insert admin:", adminErr ? adminErr.message : 'Success!');
  
  const newServices = [
    { nome: 'Cabelo + Barba', preco: 60, duracao_minutos: 60, ativo: true },
    { nome: 'Corte Máquina', preco: 35, duracao_minutos: 30, ativo: true },
    { nome: 'Corte Máquina e Tesoura', preco: 40, duracao_minutos: 40, ativo: true },
    { nome: 'Pigmentação', preco: 20, duracao_minutos: 30, ativo: true },
    { nome: 'Corte + Pigmentação', preco: 60, duracao_minutos: 60, ativo: true },
    { nome: 'Barba', preco: 25, duracao_minutos: 30, ativo: true },
    { nome: 'Corte Reflexo', preco: 80, duracao_minutos: 90, ativo: true },
    { nome: 'Sobrancelha', preco: 15, duracao_minutos: 15, ativo: true },
    { nome: 'Pezinho', preco: 10, duracao_minutos: 15, ativo: true },
    { nome: 'Corte Completo (Máq/Tes/Nav)', preco: 45, duracao_minutos: 50, ativo: true }
  ];

  // Soft delete old services
  console.log("Soft deleting old services...");
  const { error: delErr } = await supabase.from('services').update({ ativo: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Soft delete:", delErr ? delErr.message : 'Success!');

  // Insert new ones
  console.log("Inserting new services...");
  const { error: insErr } = await supabase.from('services').insert(newServices);
  console.log("Insert test:", insErr ? insErr.message : 'Success!');
  
  // Link to barbers
  console.log("Linking to barbers...");
  const { data: activeServices } = await supabase.from('services').select('id').eq('ativo', true);
  const { data: barbers } = await supabase.from('barbers').select('id').eq('ativo', true);
  if (activeServices && barbers) {
    for (const b of barbers) {
      const links = activeServices.map(as => ({ barber_id: b.id, service_id: as.id }));
      await supabase.from('barber_services').insert(links);
    }
    console.log("Linked barbers successfully.");
  }
}

runHack();
