export type Service = {
  id: string;
  nome: string;
  duracao: number; // minutos
  preco: number;
  desc: string;
};

export type Barber = {
  id: string;
  nome: string;
  especialidade: string;
  foto: string;
  hora_inicio: string; // "09:00"
  hora_fim: string;    // "20:00"
};

export const SERVICES: Service[] = [
  { id: "corte",  nome: "Corte",          duracao: 40, preco: 45, desc: "Tesoura + máquina, do jeito que tu gosta." },
  { id: "barba",  nome: "Barba",          duracao: 30, preco: 35, desc: "Toalha quente, navalha e finalização." },
  { id: "combo",  nome: "Combo Cabelo + Barba", duracao: 70, preco: 70, desc: "O pacote completo. Sai novo daqui." },
  { id: "degrade", nome: "Degradê",       duracao: 50, preco: 55, desc: "Fade no precision, traço afiado." },
  { id: "pezinho", nome: "Pezinho",       duracao: 15, preco: 15, desc: "Aquele acerto rápido pra segurar a semana." },
  { id: "sombrancelha", nome: "Sobrancelha", duracao: 15, preco: 20, desc: "Limpeza no jeito." },
];

export const BARBERS: Barber[] = [
  { id: "rato",   nome: "Rato",   especialidade: "Degradê e navalha",     foto: "https://i.pravatar.cc/300?img=12", hora_inicio: "09:00", hora_fim: "20:00" },
  { id: "jhow",   nome: "Jhow",   especialidade: "Barba e desenhos",      foto: "https://i.pravatar.cc/300?img=15", hora_inicio: "10:00", hora_fim: "20:00" },
  { id: "matheus", nome: "Matheus", especialidade: "Clássico e social",   foto: "https://i.pravatar.cc/300?img=33", hora_inicio: "09:00", hora_fim: "19:00" },
];

// Bloqueios fixos (almoço)
const BLOCKS: Record<string, { inicio: string; fim: string }[]> = {
  rato:    [{ inicio: "13:00", fim: "14:00" }],
  jhow:    [{ inicio: "13:30", fim: "14:30" }],
  matheus: [{ inicio: "12:00", fim: "13:00" }],
};

// Mock de horários "ocupados" pra mostrar bloqueio visual
function mockBooked(barberId: string, dateISO: string): { inicio: string; fim: string }[] {
  // gera 2-3 horários ocupados pseudo-aleatórios pela data
  const seed = [...dateISO + barberId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const opts = [
    { inicio: "10:00", fim: "10:40" },
    { inicio: "11:30", fim: "12:10" },
    { inicio: "15:00", fim: "16:10" },
    { inicio: "17:30", fim: "18:00" },
    { inicio: "19:00", fim: "19:30" },
  ];
  return opts.filter((_, i) => (seed + i) % 3 === 0);
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export type Slot = { hora: string; livre: boolean };

export function generateSlots(
  barberId: string,
  dateISO: string,
  duracao: number,
): Slot[] {
  const barber = BARBERS.find((b) => b.id === barberId);
  if (!barber) return [];
  const start = toMin(barber.hora_inicio);
  const end = toMin(barber.hora_fim);
  const buffer = 5;
  const step = 15;
  const blocks = [
    ...(BLOCKS[barberId] || []),
    ...mockBooked(barberId, dateISO),
  ].map((b) => ({ a: toMin(b.inicio), b: toMin(b.fim) }));

  const slots: Slot[] = [];
  for (let t = start; t + duracao <= end; t += step) {
    const t2 = t + duracao + buffer;
    const conflito = blocks.some(({ a, b }) => t < b && t2 > a);
    slots.push({ hora: fromMin(t), livre: !conflito });
  }
  return slots;
}

export function autoPickBarber(): Barber {
  // mock: pseudo "menos agendamentos do dia"
  return BARBERS[Math.floor(Math.random() * BARBERS.length)];
}

export function gerarCodigo(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}