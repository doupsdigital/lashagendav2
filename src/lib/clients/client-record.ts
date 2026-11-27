/** Atendimento registrado à mão (F7.4): algo feito fora do app que entra no
 *  histórico e nos números (`origin = 'record'`, sempre `completed`). Não
 *  ocupa horário — a trava do banco e a agenda ignoram `record`.
 *  Arquivo puro (sem imports) — `scripts/test-client-record.mjs`. */

/** Data mais antiga aceita (atendimento de anos atrás ainda serve). */
export const MIN_RECORD_DATE = '2000-01-01';
export const MAX_RECORD_NOTES = 500;

/** Problema com a data do registro ("AAAA-MM-DD"), ou null se está boa.
 *  `today` no mesmo formato, fuso do estúdio. */
export function recordDateProblem(value: unknown, today: string): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Escolha a data do atendimento.';
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return 'Data inválida.';
  if (value > today) return 'Só dá para registrar atendimento de hoje ou de antes. Para o futuro, agende pela agenda.';
  if (value < MIN_RECORD_DATE) return 'Data muito antiga.';
  return null;
}

/** Registro fica ao meio-dia do dia (não tem horário de verdade): longe da
 *  virada do dia em qualquer fuso, então a data nunca "pula". */
export const RECORD_TIME = '12:00:00';
