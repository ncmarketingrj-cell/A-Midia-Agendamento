import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "A Mídia Barbearia — Agenda seu horário" },
      { name: "description", content: "Corte, barba e degradê. Marca teu horário rapidinho." },
      { property: "og:title", content: "A Mídia Barbearia" },
      { property: "og:description", content: "Marca teu horário em 3 toques." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.18),transparent_70%)]" />

      <header className="relative z-10 flex w-full max-w-md flex-col items-center pt-6">
        <img
          src={logo}
          alt="A Mídia Barbearia"
          className="h-44 w-44 rounded-full object-cover shadow-[0_0_60px_-10px_rgba(212,175,55,0.45)] ring-1 ring-gold/40"
        />
      </header>

      <section className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
          Barbearia · Rio
        </span>
        <h1 className="font-display text-6xl uppercase leading-[0.9] text-foreground">
          Tá na hora do <span className="text-gold">corte</span>.
        </h1>
        <p className="mt-4 max-w-xs text-base text-muted-foreground">
          Escolhe o serviço, o barbeiro e o horário. Em 3 toques tu tá com o nome na agenda.
        </p>
      </section>

      <div className="relative z-10 flex w-full max-w-md flex-col gap-3 pb-4">
        <Link
          to="/agendar"
          className="group flex h-14 items-center justify-center rounded-md gold-gradient text-base font-bold uppercase tracking-wider text-primary-foreground shadow-[0_10px_30px_-10px_rgba(212,175,55,0.6)] transition active:scale-[0.98]"
        >
          Bora marcar
          <span className="ml-2 transition group-hover:translate-x-1">→</span>
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          Funciona melhor pelo celular · Aberto seg–sáb
        </p>
      </div>
    </main>
  );
}
