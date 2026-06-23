import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Check, ChevronLeft, Clock, Scissors, Sparkles, Shuffle } from "lucide-react";
import { toast } from "sonner";

export type Service = {
  id: string
  nome: string
  descricao: string
  duracao_minutos: number
  preco: number
}

export type Barber = {
  id: string
  nome: string
  especialidade: string
  foto_url: string
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarCodigo(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Marcar horário · A Mídia Barbearia" },
      { name: "description", content: "Escolhe o serviço, o barbeiro e o horário." },
    ],
  }),
  component: AgendarPage,
});

type Step = 1 | 2 | 3 | 4;

function AgendarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<Service | null>(null);
  const [barber, setBarber] = useState<Barber | "auto" | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<{ hora: string; livre: boolean }[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      const [resServ, resBarb] = await Promise.all([
        supabase.from("services").select("*").eq("ativo", true).order("nome"),
        supabase.from("barbers").select("*").eq("ativo", true).order("nome"),
      ]);
      if (resServ.data) setServices(resServ.data);
      if (resBarb.data) setBarbers(resBarb.data);
      setLoadingConfig(false);
    }
    loadConfig();
  }, []);

  const titulos: Record<Step, { titulo: string; sub: string }> = {
    1: { titulo: "Qual vai ser hoje?", sub: "Escolhe o serviço." },
    2: { titulo: "Quem corta?", sub: "Escolhe teu barbeiro ou deixa com a casa." },
    3: { titulo: "Que dia rola?", sub: "Horário ocupado tá bloqueado." },
    4: { titulo: "Quase lá.", sub: "Só teu nome e zap pra confirmar." },
  };

  const proximosDias = useMemo(() => {
    const arr: { iso: string; dia: string; numero: number; mes: string }[] = [];
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        iso: d.toISOString().slice(0, 10),
        dia: dias[d.getDay()],
        numero: d.getDate(),
        mes: meses[d.getMonth()],
      });
    }
    return arr;
  }, []);

  // Fetch slots whenever service, barber or date changes
  useEffect(() => {
    async function fetchSlots() {
      if (!service || !barber || step !== 3) return;
      
      const barberId = barber === "auto" ? "auto" : barber.id;
      
      // Chamar Edge Function "get-available-slots"
      const { data, error } = await supabase.functions.invoke("get-available-slots", {
        body: { date: date, serviceId: service.id, barberId: barberId },
      });
      
      if (error) {
        toast.error("Erro ao buscar horários: " + error.message);
        setSlots([]);
      } else {
        setSlots(data.slots || []);
        if (barber === "auto" && data.assignedBarberId) {
          // A casa escolheu o barbeiro por baixo dos panos, mas mantemos visualmente "A casa escolhe"
          // O id do barbeiro real ficará salvo no objeto slot retornado pela função (ou guardamos separadamente)
        }
      }
    }
    fetchSlots();
  }, [service, barber, date, step]);

  async function confirmar() {
    if (!service || !hora) return;
    setLoadingConfig(true);
    
    // Obter o ID real do barbeiro caso seja "auto"
    let realBarberId = barber === "auto" ? null : barber?.id;
    if (barber === "auto") {
      // In a real app we would call auto-assign-barber edge function to officially assign it now
      const { data, error } = await supabase.functions.invoke("auto-assign-barber", {
        body: { date, startTime: hora, duration: service.duracao_minutos }
      });
      if (data?.barberId) realBarberId = data.barberId;
      else realBarberId = barbers[0]?.id; // Fallback
    }

    const { error } = await supabase.from("appointments").insert({
      barber_id: realBarberId,
      service_id: service.id,
      client_name: nome,
      client_phone: tel,
      appointment_date: date,
      start_time: hora,
      end_time: hora, // To be calculated properly by DB triggers or here
      status: "scheduled"
    });

    if (error) {
      toast.error("Erro ao agendar: " + error.message);
      setLoadingConfig(false);
      return;
    }

    const codigo = gerarCodigo();
    const chosenBarber = barbers.find(b => b.id === realBarberId) || barbers[0];
    navigate({
      to: "/sucesso",
      search: {
        codigo,
        nome,
        servico: service.nome,
        barbeiro: barber === "auto" ? "A casa escolhe" : chosenBarber?.nome,
        data: date,
        hora: hora,
      },
    });
  }

  function voltar() {
    if (step === 1) {
      navigate({ to: "/" });
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={voltar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.25em] text-gold">
              Passo {step} de 4
            </p>
            <h1 className="truncate font-display text-2xl uppercase">{titulos[step].titulo}</h1>
          </div>
        </div>
        {/* progress */}
        <div className="mx-auto mt-3 flex max-w-md gap-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= step ? "bg-gold" : "bg-border"}`}
            />
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-6">
        <p className="mb-5 text-sm text-muted-foreground">{titulos[step].sub}</p>

        {step === 1 && (
          <div className="space-y-3">
            {services.map((s) => {
              const ativo = service?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setService(s);
                    setTimeout(() => setStep(2), 150);
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    ativo
                      ? "border-gold bg-gold/5"
                      : "border-border bg-card hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-secondary text-gold">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-display text-xl uppercase">{s.nome}</h3>
                        <span className="font-bold text-gold">{brl(s.preco)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.descricao}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.duracao_minutos} min
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {services.length === 0 && !loadingConfig && (
              <p className="text-center text-sm text-muted-foreground">Nenhum serviço disponível.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <button
              onClick={() => {
                setBarber("auto");
                setTimeout(() => setStep(3), 150);
              }}
              className={`w-full rounded-lg border p-4 text-left transition ${
                barber === "auto"
                  ? "border-gold bg-gold/5"
                  : "border-dashed border-gold/40 bg-card hover:border-gold"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full gold-gradient">
                  <Shuffle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl uppercase">Deixa que a casa escolhe</h3>
                  <p className="text-sm text-muted-foreground">
                    A gente joga pro barbeiro mais livre no dia.
                  </p>
                </div>
              </div>
            </button>

            {barbers.map((b) => {
              const ativo = barber !== "auto" && barber?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setBarber(b);
                    setTimeout(() => setStep(3), 150);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    ativo
                      ? "border-gold bg-gold/5"
                      : "border-border bg-card hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={b.foto_url}
                      alt={b.nome}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-gold/30"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl uppercase leading-tight">{b.nome}</h3>
                      <p className="truncate text-sm text-muted-foreground">{b.especialidade}</p>
                    </div>
                    {ativo && <Check className="h-5 w-5 shrink-0 text-gold" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}



        {step === 3 && (
          <div className="space-y-6">
            {/* date strip */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Dia
              </p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                {proximosDias.map((d) => {
                  const ativo = d.iso === date;
                  return (
                    <button
                      key={d.iso}
                      onClick={() => {
                        setDate(d.iso);
                        setHora(null);
                      }}
                      className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-lg border transition ${
                        ativo
                          ? "border-gold bg-gold text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-widest opacity-80">
                        {d.dia}
                      </span>
                      <span className="font-display text-2xl leading-none">{d.numero}</span>
                      <span className="text-[10px] uppercase opacity-80">{d.mes}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* slots */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Horário
              </p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => {
                  const ativo = hora === s.hora;
                  if (!s.livre) {
                    return (
                      <div
                        key={s.hora}
                        className="relative grid h-12 place-items-center rounded-md border border-border bg-secondary/40 text-sm text-muted-foreground line-through"
                      >
                        {s.hora}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={s.hora}
                      onClick={() => setHora(s.hora)}
                      className={`grid h-12 place-items-center rounded-md border text-sm font-semibold transition ${
                        ativo
                          ? "border-gold bg-gold text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-gold/60"
                      }`}
                    >
                      {s.hora}
                    </button>
                  );
                })}
              </div>
              {slots.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhum horário livre neste dia.
                </p>
              ) : slots.every((s) => !s.livre) ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Esse dia tá cheio. Tenta outro dia.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <ResumoCard
              service={service}
              barber={barber}
              date={date}
              hora={hora}
            />
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                  Teu nome
                </span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como tu se chama?"
                  className="h-12 w-full rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-gold"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                  Zap
                </span>
                <input
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="(21) 9XXXX-XXXX"
                  inputMode="tel"
                  className="h-12 w-full rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-gold"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          {step === 3 && (
            <button
              disabled={!hora}
              onClick={() => setStep(4)}
              className="flex h-14 w-full items-center justify-center rounded-md gold-gradient font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
            >
              Continuar
            </button>
          )}
          {step === 4 && (
            <button
              disabled={nome.trim().length < 2 || tel.trim().length < 8}
              onClick={confirmar}
              className="flex h-14 w-full items-center justify-center rounded-md gold-gradient font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Fechar horário
            </button>
          )}
          {(step === 1 || step === 2) && (
            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground"
            >
              Cancelar agendamento
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function ResumoCard({
  service,
  barber,
  date,
  hora,
}: {
  service: Service | null;
  barber: Barber | "auto" | null;
  date: string;
  hora: string | null;
}) {
  const barberLabel = barber === "auto" ? "A casa escolhe" : barber?.nome ?? "—";
  const dataFmt = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return (
    <div className="rounded-lg border border-gold/30 bg-card p-4">
      <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-gold">Resumo</p>
      <div className="space-y-2 text-sm">
        <Linha k="Serviço" v={service ? `${service.nome} · ${service.duracao_minutos} min` : "—"} />
        <Linha k="Barbeiro" v={barberLabel} />
        <Linha k="Quando" v={`${dataFmt} às ${hora}`} />
        <Linha k="Valor" v={service ? brl(service.preco) : "—"} destaque />
      </div>
    </div>
  );
}

function Linha({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`text-right ${destaque ? "font-display text-xl text-gold" : "text-foreground"}`}>
        {v}
      </span>
    </div>
  );
}