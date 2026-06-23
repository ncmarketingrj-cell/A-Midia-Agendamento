-- Adicionar coluna servicos_resumo
alter table public.appointments add column if not exists servicos_resumo text;

-- Refatorar policies para remover o acesso ALL (que inclui DELETE) dos barbeiros e dar grants especificos
drop policy if exists "Barbeiro ve proprios appointments" on appointments;

-- Assegurar que os barbeiros podem dar SELECT (Ver) na sua propria agenda
create policy "Barbeiro ve proprios appointments" on appointments for select using (barber_id = get_my_barber_id());

-- Assegurar que os barbeiros podem fazer INSERT na sua propria agenda
create policy "Barbeiro insere proprios appointments" on appointments for insert with check (barber_id = get_my_barber_id());

-- Assegurar que os barbeiros podem fazer UPDATE na sua propria agenda (para marcar como concluido/cancelado ou editar)
create policy "Barbeiro edita proprios appointments" on appointments for update using (barber_id = get_my_barber_id());

-- (Nenhuma policy de DELETE é criada para o barbeiro, ou seja, eles não podem deletar linhas)
