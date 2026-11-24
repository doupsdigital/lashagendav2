/** Regras das folgas e bloqueios (F4.2): dias inteiros (férias, feriados) ou
 *  uma faixa de horário repetida em cada dia do período. Arquivo puro — a
 *  tela de Config, a Agenda e a API usam as mesmas regras. */
import { isValidTime, timeToMinutes } from './business-hours';

export const MAX_BLOCK_DAYS = 366;
export const MAX_BLOCK_REASON = 120;

export interface BlockInput {
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-12-10" válido de verdade (rejeita 2026-02-31). */
export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Quantos dias o período cobre, contando os dois extremos. */
export function blockDayCount(startDate: string, endDate: string): number {
  const ms = new Date(`${endDate}T12:00:00Z`).getTime() - new Date(`${startDate}T12:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Primeiro problema do bloqueio, em texto para a profissional, ou `null`. */
export function findBlockProblem(b: BlockInput): string | null {
  if (!isValidDateKey(b.start_date) || !isValidDateKey(b.end_date)) return 'Escolha as datas do bloqueio.';
  if (b.end_date < b.start_date) return 'A data final tem que ser igual ou depois da inicial.';
  if (blockDayCount(b.start_date, b.end_date) > MAX_BLOCK_DAYS) return 'O bloqueio pode ter no máximo 1 ano.';
  if (!b.all_day) {
    if (!isValidTime(b.start_time) || !isValidTime(b.end_time)) return 'Informe o horário de início e fim, ou marque "dia inteiro".';
    if (timeToMinutes(b.start_time) >= timeToMinutes(b.end_time)) return 'O horário de início tem que ser antes do fim.';
  }
  return null;
}

/** Hoje ("YYYY-MM-DD") no fuso do estúdio. */
export function todayDateKey(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
