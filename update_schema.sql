begin;

-- 1. Create junction table for barber services
create table if not exists public.barber_services (
  barber_id uuid references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- Enable RLS for barber_services
alter table public.barber_services enable row level security;
drop policy if exists "Admin total barber_services" on public.barber_services;
create policy "Admin total barber_services" on public.barber_services for all using (public.is_admin());
create policy "Leitura publica barber_services" on public.barber_services for select using (true);

-- 2. Populate junction table with all existing services for all barbers
-- By default, all existing barbers perform all existing services
insert into public.barber_services (barber_id, service_id)
select b.id, s.id
from public.barbers b
cross join public.services s
on conflict do nothing;

-- 3. Create Storage bucket for barber-photos if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('barber-photos', 'barber-photos', true)
on conflict (id) do nothing;

-- Set up storage policies
drop policy if exists "Imagens publicas" on storage.objects;
create policy "Imagens publicas" on storage.objects for select using (bucket_id = 'barber-photos');

drop policy if exists "Admin pode fazer upload de imagem" on storage.objects;
create policy "Admin pode fazer upload de imagem" on storage.objects for insert with check (
  bucket_id = 'barber-photos' and public.is_admin()
);

drop policy if exists "Admin pode excluir imagem" on storage.objects;
create policy "Admin pode excluir imagem" on storage.objects for delete using (
  bucket_id = 'barber-photos' and public.is_admin()
);

commit;
