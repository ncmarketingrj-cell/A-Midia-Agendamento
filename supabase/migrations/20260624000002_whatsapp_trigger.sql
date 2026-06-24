-- 1. Habilitar a extensão de rede do Supabase
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Adicionar as colunas na tabela de configurações para guardar as senhas do WhatsApp
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS wpp_api_url text;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS wpp_api_key text;

-- 3. Criar a função que envia o WhatsApp de fato
CREATE OR REPLACE FUNCTION send_whatsapp_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_wpp_url text;
  v_wpp_key text;
  v_template text;
  v_mensagem text;
  v_telefone_limpo text;
  v_barbeiro_nome text;
  v_servico_nome text;
BEGIN
  -- Pegar as configurações do WhatsApp
  SELECT wpp_api_url, wpp_api_key INTO v_wpp_url, v_wpp_key FROM shop_settings LIMIT 1;
  
  -- Se o WhatsApp não estiver configurado, não faz nada
  IF v_wpp_url IS NULL OR v_wpp_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pegar o template de confirmação que você configurou
  SELECT texto INTO v_template FROM message_templates WHERE titulo = 'Confirmação de Agendamento' LIMIT 1;
  
  -- Se não existir o template, usa um padrão de segurança
  IF v_template IS NULL THEN
    v_template := 'Fala [NOME_CLIENTE]! Seu agendamento foi confirmado para o dia [DATA] às [HORA]! Código: [CODIGO]';
    -- Já que não existe, vamos criar ele para você poder editar no painel depois
    INSERT INTO message_templates (titulo, texto) VALUES ('Confirmação de Agendamento', v_template);
  END IF;

  -- Buscar o nome do barbeiro e do serviço para colocar na mensagem
  SELECT nome INTO v_barbeiro_nome FROM barbers WHERE id = NEW.barber_id;
  SELECT nome INTO v_servico_nome FROM services WHERE id = NEW.service_id;

  -- Limpar o telefone (deixar só números)
  v_telefone_limpo := regexp_replace(NEW.telefone, '\D', '', 'g');
  
  -- Para envios no Brasil, garantir que tenha o 55
  IF length(v_telefone_limpo) <= 11 THEN
    v_telefone_limpo := '55' || v_telefone_limpo;
  END IF;

  -- Substituir as palavras-chave pelos dados reais do cliente
  v_mensagem := replace(v_template, '[NOME_CLIENTE]', split_part(NEW.cliente_nome, ' ', 1));
  v_mensagem := replace(v_mensagem, '[DATA]', to_char(NEW.data_hora_inicio, 'DD/MM/YYYY'));
  v_mensagem := replace(v_mensagem, '[HORA]', to_char(NEW.data_hora_inicio, 'HH24:MI'));
  v_mensagem := replace(v_mensagem, '[CODIGO]', NEW.codigo_confirmacao);
  v_mensagem := replace(v_mensagem, '[BARBEIRO]', coalesce(v_barbeiro_nome, 'nossa equipe'));
  v_mensagem := replace(v_mensagem, '[SERVICO]', coalesce(NEW.servicos_resumo, v_servico_nome, 'corte'));

  -- Fazer o disparo para o Evolution API no Railway via requisição HTTP
  PERFORM net.http_post(
    url := v_wpp_url || '/message/sendText/MidiaBarbearia',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_wpp_key),
    body := jsonb_build_object('number', v_telefone_limpo, 'text', v_mensagem)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar o Gatilho (Trigger) para disparar sempre que um agendamento for feito
DROP TRIGGER IF EXISTS trigger_send_whatsapp ON appointments;
CREATE TRIGGER trigger_send_whatsapp
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION send_whatsapp_on_appointment();
