ALTER TABLE public.services ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '';
ALTER TABLE public.blocked_times ADD COLUMN IF NOT EXISTS motivo TEXT DEFAULT '';

-- Refresh the schema cache so PostgREST picks it up immediately
NOTIFY pgrst, 'reload schema';
