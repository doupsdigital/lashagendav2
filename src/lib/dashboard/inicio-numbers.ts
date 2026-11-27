/** Números do Início (F9.1). Arquivo puro (sem imports) — o
 *  `scripts/test-inicio-numbers.mjs` roda direto no Node. Datas "YYYY-MM-DD"
 *  no fuso America/Sao_Paulo. Valores em número; quem mostra formata. */

/** Primeiro dia do mês da data ("2026-11-26" → "2026-11-01"). */
export function monthStartKey(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

/** Primeiro dia do mês seguinte ("2026-12-15" → "2027-01-01"). */
export function nextMonthStartKey(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Data "YYYY-MM-DD" de um instante, no fuso de SP. */
export function spDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export interface RevenueRow {
  starts_at: string;
  status: string;
  amount_received: number | null;
}

/** Faturado = soma do valor recebido nos atendimentos concluídos (inclui os
 *  registrados à mão no histórico). Hoje e no mês da data `today`. Soma em
 *  centavos para não acumular erro de ponto flutuante. */
export function sumRevenue(rows: RevenueRow[], today: string): { today: number; month: number } {
  const month = today.slice(0, 7);
  let todayCents = 0;
  let monthCents = 0;
  for (const r of rows) {
    if (r.status !== 'completed' || r.amount_received === null) continue;
    const day = spDateKey(r.starts_at);
    if (day.slice(0, 7) !== month) continue;
    const cents = Math.round(r.amount_received * 100);
    monthCents += cents;
    if (day === today) todayCents += cents;
  }
  return { today: todayCents / 100, month: monthCents / 100 };
}

export type DayTagTone = 'green' | 'amber' | 'rose' | 'gray';

/** Etiqueta de cada horário da "Agenda de hoje". */
export function dayTag(status: string): { label: string; tone: DayTagTone } {
  switch (status) {
    case 'pending':
      return { label: 'Aguardando', tone: 'amber' };
    case 'confirmed':
      return { label: 'Confirmado', tone: 'green' };
    case 'completed':
      return { label: 'Concluído', tone: 'rose' };
    case 'no_show':
      return { label: 'Faltou', tone: 'gray' };
    default:
      return { label: 'Cancelado', tone: 'gray' };
  }
}

/** Duração curta ("2h", "1h30", "45min"). */
export function shortDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
