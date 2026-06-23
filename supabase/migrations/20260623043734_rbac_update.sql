-- Adicionar a coluna barber_id na tabela admin_users
alter table admin_users add column if not exists barber_id uuid references barbers(id);

-- Funções utilitárias para RLS
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
