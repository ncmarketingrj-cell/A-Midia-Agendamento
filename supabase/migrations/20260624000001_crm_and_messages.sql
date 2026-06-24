-- Criar tabela de Templates de Mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  created_at timestamptz default now()
);

-- Criar tabela de Clientes (CRM)
CREATE TABLE IF NOT EXISTS clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  total_agendamentos int default 0,
  ultimo_agendamento timestamptz,
  barber_id uuid references barbers(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a message_templates para auth" ON message_templates FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total a clients para auth" ON clients FOR ALL USING (auth.role() = 'authenticated');

-- Função do Trigger para alimentar o CRM automaticamente ao inserir agendamento
CREATE OR REPLACE FUNCTION upsert_client_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clients (nome, telefone, total_agendamentos, ultimo_agendamento, barber_id)
  VALUES (NEW.cliente_nome, NEW.telefone, 1, NEW.data_hora_inicio, NEW.barber_id)
  ON CONFLICT (telefone) DO UPDATE
  SET total_agendamentos = clients.total_agendamentos + 1,
      ultimo_agendamento = GREATEST(clients.ultimo_agendamento, NEW.data_hora_inicio),
      nome = NEW.cliente_nome,
      barber_id = NEW.barber_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o Trigger
DROP TRIGGER IF EXISTS on_appointment_created ON appointments;
CREATE TRIGGER on_appointment_created
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION upsert_client_on_appointment();

-- Popular tabela clients com os agendamentos que já existem no banco
INSERT INTO clients (nome, telefone, total_agendamentos, ultimo_agendamento, barber_id)
SELECT 
  MAX(cliente_nome) as nome, 
  telefone, 
  COUNT(*) as total_agendamentos, 
  MAX(data_hora_inicio) as ultimo_agendamento,
  (SELECT barber_id FROM appointments a2 WHERE a2.telefone = a.telefone ORDER BY data_hora_inicio DESC LIMIT 1) as barber_id
FROM appointments a
GROUP BY telefone
ON CONFLICT (telefone) DO NOTHING;

-- Inserir alguns templates padrão
INSERT INTO message_templates (titulo, texto) VALUES
('Lembrete de Horário', 'Fala [NOME_CLIENTE]! Passando pra lembrar do seu horário de [SERVICO] hoje às [HORA] com o barbeiro [BARBEIRO]. Tamo junto!'),
('Agradecimento Pós-Corte', 'Fala [NOME_CLIENTE]! Obrigado pela preferência de sempre, irmão. Curtiu o [SERVICO]? Qualquer coisa chama aqui!'),
('Sumido (Recuperação)', 'Fala [NOME_CLIENTE], tudo certo? Tem um tempinho que você não aparece pra dar aquele tapa no visual. Bora agendar seu [SERVICO] pra essa semana?')
ON CONFLICT DO NOTHING;
