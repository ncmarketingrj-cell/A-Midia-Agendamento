-- Deactivate old services to keep FK constraints intact
UPDATE public.services SET ativo = false;

-- Insert new services
INSERT INTO public.services (nome, preco, duracao_minutos, ativo) VALUES
  ('Cabelo + Barba', 60.00, 60, true),
  ('Corte Máquina', 35.00, 30, true),
  ('Corte Máquina e Tesoura', 40.00, 40, true),
  ('Pigmentação', 20.00, 30, true),
  ('Corte + Pigmentação', 60.00, 60, true),
  ('Barba', 25.00, 30, true),
  ('Corte Reflexo', 80.00, 90, true),
  ('Sobrancelha', 15.00, 15, true),
  ('Pezinho', 10.00, 15, true),
  ('Corte Completo (Máq/Tes/Nav)', 45.00, 50, true);

-- Since we added new services, we must link them to all active barbers 
-- so they show up on the public page.

DO $$
DECLARE
    b_id UUID;
    s_id UUID;
BEGIN
    FOR b_id IN SELECT id FROM public.barbers WHERE ativo = true LOOP
        FOR s_id IN SELECT id FROM public.services WHERE ativo = true AND nome IN (
            'Cabelo + Barba', 'Corte Máquina', 'Corte Máquina e Tesoura', 'Pigmentação', 
            'Corte + Pigmentação', 'Barba', 'Corte Reflexo', 'Sobrancelha', 'Pezinho', 'Corte Completo (Máq/Tes/Nav)'
        ) LOOP
            INSERT INTO public.barber_services (barber_id, service_id) 
            VALUES (b_id, s_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
