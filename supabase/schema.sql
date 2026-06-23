-- Configuração geral da barbearia (expediente único)
create table shop_settings (
  id uuid primary key default gen_random_uuid(),
  hora_abertura time not null default '09:00',
  hora_fechamento time not null default '20:00',
  dias_funcionamento int[] not null default '{1,2,3,4,5,6}', -- 0=dom...6=sab
  buffer_minutos int not null default 5
);

-- Barbeiros (gerenciado 100% pelo admin)
create table barbers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  foto_url text,
  especialidade text,
  comissao_percentual numeric(5,2) not null default 50.00, -- % que o barbeiro recebe
  ativo boolean not null default true,
  created_at timestamptz default now()
);

-- Serviços
create table services (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_minutos int not null,
  preco numeric(10,2) not null,
  ativo boolean not null default true
);

-- Bloqueios individuais (folga, almoço fora do padrão, atestado etc)
create table blocked_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references barbers(id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  motivo text
);

-- Agendamentos
create table appointments (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  telefone text not null,
  barber_id uuid references barbers(id),
  service_id uuid references services(id),
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz not null,
  codigo_confirmacao text not null,
  status text not null default 'agendado', -- agendado / finalizado / cancelado / no_show
  preco_cobrado numeric(10,2), -- snapshot do preço no momento (caso preço mude depois)
  created_at timestamptz default now()
);

-- Admins (login do painel)
create table admin_users (
  id uuid primary key references auth.users(id),
  nome text,
  role text default 'admin', -- admin / barbeiro
  barber_id uuid references barbers(id) -- link para qual barbeiro este usuario pertence
);

-- Índices úteis
create index idx_appointments_barber_data on appointments(barber_id, data_hora_inicio);
create index idx_appointments_status on appointments(status);

-- Funções utilitárias para RLS (Security Definer para evitar recursão infinita)
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from public.admin_users where id = auth.uid();
  return user_role = 'admin';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_my_barber_id()
returns uuid as $$
declare
  b_id uuid;
begin
  select barber_id into b_id from public.admin_users where id = auth.uid();
  return b_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Habilitar RLS em todas as tabelas
alter table shop_settings enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table blocked_times enable row level security;
alter table appointments enable row level security;
alter table admin_users enable row level security;

-- Policies para Appointments (público insere, admin lê/edita)
create policy "Agendamento livre para inserção pública" on appointments for insert with check (true);
-- Drop antigas policies para recriar
drop policy if exists "Acesso total a appointments para admin" on appointments;
drop policy if exists "Acesso total a shop_settings para admin" on shop_settings;
drop policy if exists "Acesso total a barbers para admin" on barbers;
drop policy if exists "Acesso total a services para admin" on services;
drop policy if exists "Acesso total a blocked_times para admin" on blocked_times;
drop policy if exists "Acesso total a admin_users para admin" on admin_users;

-- Appointments
create policy "Admin total appointments" on appointments for all using (is_admin());
create policy "Barbeiro ve proprios appointments" on appointments for all using (barber_id = get_my_barber_id());

-- Shop Settings
create policy "Admin total shop_settings" on shop_settings for all using (is_admin());

-- Barbers
create policy "Admin total barbers" on barbers for all using (is_admin());

-- Services
create policy "Admin total services" on services for all using (is_admin());

-- Blocked Times
create policy "Admin total blocked_times" on blocked_times for all using (is_admin());
create policy "Barbeiro gerencia proprios bloqueios" on blocked_times for all using (barber_id = get_my_barber_id());

-- Admin Users
create policy "Admin total admin_users" on admin_users for all using (is_admin());
create policy "Leitura propria admin_users" on admin_users for select using (auth.uid() = id);
