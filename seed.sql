begin;

-- Inserir Configuração da Loja (se não existir)
insert into public.shop_settings (hora_abertura, hora_fechamento, dias_funcionamento, buffer_minutos)
select '09:00', '20:00', '{1,2,3,4,5,6}', 5
where not exists (select 1 from public.shop_settings);

-- Inserir Serviços
insert into public.services (nome, duracao_minutos, preco, ativo) values
('Corte', 40, 45.00, true),
('Barba', 30, 35.00, true),
('Combo Cabelo + Barba', 70, 70.00, true),
('Degradê', 50, 55.00, true),
('Pezinho', 15, 15.00, true),
('Sobrancelha', 15, 20.00, true);

-- Inserir Barbeiros
insert into public.barbers (nome, foto_url, especialidade, comissao_percentual, ativo) values
('Rato', 'https://i.pravatar.cc/300?img=12', 'Degradê e navalha', 50.00, true),
('Jhow', 'https://i.pravatar.cc/300?img=15', 'Barba e desenhos', 50.00, true),
('Matheus', 'https://i.pravatar.cc/300?img=33', 'Clássico e social', 50.00, true);

commit;
