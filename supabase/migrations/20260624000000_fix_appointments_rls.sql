-- Permite que o público leia os agendamentos para poder calcular os horários livres
CREATE POLICY "Leitura publica de agendamentos" ON public.appointments FOR SELECT USING (true);
