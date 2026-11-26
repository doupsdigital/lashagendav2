/** Relatórios por período (F9.2). Arquivo puro (sem imports) — o
 *  `scripts/test-report.mjs` roda direto no Node. Datas "YYYY-MM-DD" no fuso
 *  America/Sao_Paulo; valores em número (quem mostra formata). */

export type PeriodId = 'hoje' | 'ontem' | '7dias' | 'mes' | 'mes_passado' | 'ano' | 'personalizado';

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: '7 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'ano', label: 'Este ano' },
  { id: 'personalizado', label: 'Personalizado' },
];

/** Maior intervalo do personalizado, em dias (2 anos). */
export const MAX_CUSTOM_DAYS = 731;
/** Até quantos dias o gráfico mostra uma barra por dia; acima, por mês. */
export const MAX_DAILY_BARS = 62;

export interface ReportPeriod {
  id: PeriodId;
  /** Primeiro dia (inclusive). */
  from: string;
  /** Último dia (inclusive). */
  to: string;
  /** Aviso quando o personalizado veio inválido e caiu em "Este mês". */
  problem: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000);
}

function isRealDate(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function lastDayOfMonth(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addDays(next, -1);
}

/** Período escolhido → intervalo de datas. Valor desconhecido = "Este mês". */
export function resolvePeriod(id: unknown, today: string, de?: unknown, ate?: unknown): ReportPeriod {
  const month = today.slice(0, 7);
  const thisMonth: ReportPeriod = { id: 'mes', from: `${month}-01`, to: lastDayOfMonth(month), problem: null };
  switch (id) {
    case 'hoje':
      return { id, from: today, to: today, problem: null };
    case 'ontem': {
      const y = addDays(today, -1);
      return { id, from: y, to: y, problem: null };
    }
    case '7dias':
      return { id, from: addDays(today, -6), to: today, problem: null };
    case 'mes_passado': {
      const prev = addDays(`${month}-01`, -1).slice(0, 7);
      return { id, from: `${prev}-01`, to: lastDayOfMonth(prev), problem: null };
    }
    case 'ano':
      return { id, from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31`, problem: null };
    case 'personalizado': {
      if (!isRealDate(de) || !isRealDate(ate)) return { ...thisMonth, problem: 'Escolha as duas datas do período.' };
      if (de > ate) return { ...thisMonth, problem: 'A data de início vem depois da data de fim.' };
      if (daysBetween(de, ate) + 1 > MAX_CUSTOM_DAYS) return { ...thisMonth, problem: 'O período pode ter no máximo 2 anos.' };
      return { id, from: de, to: ate, problem: null };
    }
    default:
      return thisMonth;
  }
}

/** "26/11/2026" a partir de "2026-11-26". */
export function brDate(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
}

export function periodLabel(p: ReportPeriod): string {
  return p.from === p.to ? brDate(p.from) : `${brDate(p.from)} a ${brDate(p.to)}`;
}

export interface ReportRow {
  /** Dia do atendimento em SP ("YYYY-MM-DD"). */
  day: string;
  status: string;
  amount_received: number | null;
  services: string[];
}

export interface ReportBar {
  /** Dia ("YYYY-MM-DD") ou mês ("YYYY-MM"). */
  key: string;
  value: number;
}

export interface ReportSummary {
  total: number;
  completed: number;
  canceled: number;
  noShows: number;
  /** Aguardando ou confirmados (ainda não aconteceram ou ninguém concluiu). */
  open: number;
  received: number;
  topServices: { title: string; count: number }[];
  /** Receita por dia (até 62 dias) ou por mês. */
  bars: ReportBar[];
  barUnit: 'day' | 'month';
}

const TOP_SERVICES = 5;

/** Resumo do período. Inclui os atendimentos registrados à mão no histórico
 *  (contam como concluídos). Serviços mais feitos e receita: só concluídos. */
export function summarizeReport(rows: ReportRow[], period: Pick<ReportPeriod, 'from' | 'to'>): ReportSummary {
  const span = daysBetween(period.from, period.to) + 1;
  const barUnit: ReportSummary['barUnit'] = span <= MAX_DAILY_BARS ? 'day' : 'month';
  const barKeys: string[] = [];
  if (barUnit === 'day') {
    for (let i = 0; i < span; i += 1) barKeys.push(addDays(period.from, i));
  } else {
    for (let m = period.from.slice(0, 7); m <= period.to.slice(0, 7); m = addDays(`${m}-28`, 7).slice(0, 7)) barKeys.push(m);
  }
  const barCents = new Map(barKeys.map((k) => [k, 0]));
  const services = new Map<string, number>();
  let completed = 0;
  let canceled = 0;
  let noShows = 0;
  let receivedCents = 0;
  let total = 0;

  for (const r of rows) {
    if (r.day < period.from || r.day > period.to) continue;
    total += 1;
    if (r.status === 'canceled') canceled += 1;
    else if (r.status === 'no_show') noShows += 1;
    else if (r.status === 'completed') {
      completed += 1;
      const cents = Math.round((r.amount_received ?? 0) * 100);
      receivedCents += cents;
      const k = barUnit === 'day' ? r.day : r.day.slice(0, 7);
      barCents.set(k, (barCents.get(k) ?? 0) + cents);
      for (const s of r.services) {
        const title = s.trim();
        if (title) services.set(title, (services.get(title) ?? 0) + 1);
      }
    }
  }

  const topServices = [...services.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, TOP_SERVICES)
    .map(([title, count]) => ({ title, count }));

  return {
    total,
    completed,
    canceled,
    noShows,
    open: total - completed - canceled - noShows,
    received: receivedCents / 100,
    topServices,
    bars: barKeys.map((key) => ({ key, value: (barCents.get(key) ?? 0) / 100 })),
    barUnit,
  };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Rótulo curto da barra: "26/11" (dia) ou "nov" / "nov/26" (mês). */
export function barLabel(key: string, withYear = false): string {
  if (key.length === 10) return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  const m = MONTHS[Number(key.slice(5, 7)) - 1];
  return withYear ? `${m}/${key.slice(2, 4)}` : m;
}
