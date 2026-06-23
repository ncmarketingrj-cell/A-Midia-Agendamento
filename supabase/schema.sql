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
  role text default 'admin' -- admin / barbeiro (se quiser login individual depois)
);

-- Índices úteis
create index idx_appointments_barber_data on appointments(barber_id, data_hora_inicio);
create index idx_appointments_status on appointments(status);

-- Habilitar RLS em todas as tabelas
alter table shop_settings enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table blocked_times enable row level security;
alter table appointments enable row level security;
alter table admin_users enable row level security;

-- Policies para Appointments (público insere, admin lê/edita)
create policy "Agendamento livre para inserção pública" on appointments for insert with check (true);
create policy "Acesso total a appointments para admin" on appointments for all using (auth.role() = 'authenticated');

-- Policies base (Admin total)
create policy "Acesso total a shop_settings para admin" on shop_settings for all using (auth.role() = 'authenticated');
create policy "Leitura pública de shop_settings" on shop_settings for select using (true);

create policy "Acesso total a barbers para admin" on barbers for all using (auth.role() = 'authenticated');
create policy "Leitura pública de barbers" on barbers for select using (true);

create policy "Acesso total a services para admin" on services for all using (auth.role() = 'authenticated');
create policy "Leitura pública de services" on services for select using (true);

create policy "Acesso total a blocked_times para admin" on blocked_times for all using (auth.role() = 'authenticated');
create policy "Leitura pública de blocked_times" on blocked_times for select using (true);

create policy "Acesso total a admin_users para admin" on admin_users for all using (auth.role() = 'authenticated');
