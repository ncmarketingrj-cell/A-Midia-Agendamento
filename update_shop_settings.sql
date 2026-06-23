alter table public.shop_settings add column if not exists horarios_por_dia jsonb default '{
  "0": {"abertura": "09:00", "fechamento": "12:00", "ativo": false},
  "1": {"abertura": "09:00", "fechamento": "20:00", "ativo": true},
  "2": {"abertura": "09:00", "fechamento": "20:00", "ativo": true},
  "3": {"abertura": "09:00", "fechamento": "20:00", "ativo": true},
  "4": {"abertura": "09:00", "fechamento": "20:00", "ativo": true},
  "5": {"abertura": "09:00", "fechamento": "20:00", "ativo": true},
  "6": {"abertura": "09:00", "fechamento": "18:00", "ativo": true}
}'::jsonb;
