import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  SERVICES,
  BARBERS,
  type Service,
  type Barber,
  generateSlots,
  autoPickBarber,
  gerarCodigo,
  brl,
} from "@/lib/barbearia-data";
import { Check, ChevronLeft, Clock, Scissors, Sparkles, Shuffle } from "lucide-react";

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

  const slots = useMemo(() => {
    if (!service || !barber) return [];
    const barberId = barber === "auto" ? autoPickBarber().id : barber.id;
    return generateSlots(barberId, date, service.duracao);
  }, [service, barber, date]);

  function confirmar() {
    const codigo = gerarCodigo();
    const chosenBarber = barber === "auto" ? autoPickBarber() : barber!;
    navigate({
      to: "/sucesso",
      search: {
        codigo,
        nome,
        servico: service!.nome,
        barbeiro: chosenBarber.nome,
        data: date,
        hora: hora!,
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
            {SERVICES.map((s) => {
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
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.duracao} min
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
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

            {BARBERS.map((b) => {
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
                      src={b.foto}
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
              {slots.every((s) => !s.livre) && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Esse dia tá cheio. Tenta outro dia.
                </p>
              )}
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
        <Linha k="Serviço" v={service ? `${service.nome} · ${service.duracao} min` : "—"} />
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