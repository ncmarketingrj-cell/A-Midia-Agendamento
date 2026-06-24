import { createFileRoute, Link, useRouter, useNavigate, useLocation } from "@tanstack/react-router";
import { Check, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/sucesso")({
  head: () => ({
    meta: [{ title: "Fechado! · A Mídia Barbearia" }],
  }),
  component: SucessoPage,
});

function SucessoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  
  useEffect(() => {
    if (!state || !state.codigo) {
      navigate({ to: '/cliente' });
    }
  }, [state, navigate]);

  const { codigo, nome, servico, barbeiro, data, hora } = state || {};

  const [endereco, setEndereco] = useState("Carregando endereço...");
  
  useEffect(() => {
    async function loadAddress() {
      const { data } = await supabase.from('shop_settings').select('endereco').limit(1).single();
      if (data?.endereco) setEndereco(data.endereco);
      else setEndereco("Rua do Corte, 123 — Rio de Janeiro");
    }
    loadAddress();
  }, []);

  const dataFmt = data
    ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "—";

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.22),transparent_70%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-full gold-gradient shadow-[0_0_50px_-5px_rgba(212,175,55,0.6)]">
          <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
        </div>
        <h1 className="font-display text-5xl uppercase leading-none">Fechado!</h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">
          {nome ? `${nome.split(" ")[0]}, ` : ""}seu horário tá garantido. Tamo te esperando.
        </p>

        <div className="mt-8 w-full rounded-lg border border-gold/40 bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Código de confirmação</p>
          <p className="mt-1 font-display text-6xl tracking-[0.3em] text-gold">{codigo}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mostra esse código quando chegar.
          </p>
        </div>

        <div className="mt-5 w-full rounded-lg border border-border bg-card p-4 text-left">
          <Linha k="Serviço" v={servico} />
          <Linha k="Barbeiro" v={barbeiro} />
          <Linha k="Quando" v={`${dataFmt} · ${hora}`} />
        </div>

        <div className="mt-5 w-full rounded-lg border border-border bg-card p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-gold" /> A Mídia Barbearia
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {endereco}
          </p>
        </div>

        <div className="mt-8 flex w-full flex-col gap-2">
          <Link
            to="/cliente"
            className="flex h-12 items-center justify-center rounded-md border border-gold/40 bg-card text-sm font-semibold uppercase tracking-wider text-gold hover:bg-gold/10 transition-colors"
          >
            Fazer Novo Agendamento
          </Link>
        </div>
      </div>
    </main>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-semibold text-foreground">{v}</span>
    </div>
  );
}