/** Regras das faixas de atendimento (F4.1) — um dia pode ter mais de uma
 *  faixa (ex.: 09:00–12:00 e 13:00–18:00, com pausa de almoço no meio).
 *  Arquivo puro: a tela de horários e a API usam as mesmas regras. */

export const MAX_RANGES_PER_DAY = 6;

export interface TimeRange {
  start_time: string; // "HH:MM" (aceita "HH:MM:SS")
  end_time: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** "09:30" / "09:30:00" → 570. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Primeiro problema das faixas de um dia, em texto para a profissional, ou
 *  `null` se estiver tudo certo. Faixas encostadas (12:00 até 12:00) valem. */
export function findRangeProblem(ranges: TimeRange[]): string | null {
  if (ranges.length > MAX_RANGES_PER_DAY) return `No máximo ${MAX_RANGES_PER_DAY} faixas por dia.`;
  for (const r of ranges) {
    if (!isValidTime(r.start_time) || !isValidTime(r.end_time)) return 'Preencha o início e o fim de cada faixa.';
    if (timeToMinutes(r.start_time) >= timeToMinutes(r.end_time)) return 'O início tem que ser antes do fim.';
  }
  const sorted = [...ranges].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  for (let i = 1; i < sorted.length; i += 1) {
    if (timeToMinutes(sorted[i].start_time) < timeToMinutes(sorted[i - 1].end_time)) {
      return 'Duas faixas estão se sobrepondo.';
    }
  }
  return null;
}
