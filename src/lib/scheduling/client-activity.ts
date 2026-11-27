// Novidades do Início (F5.6): o que as clientes fizeram pelo catálogo nos
// últimos dias — agendaram ou cancelaram pelo link único. Regras puras, sem
// imports (testadas por `scripts/test-client-activity.mjs`).

/** Quanto tempo uma novidade fica no Início. */
export const ACTIVITY_WINDOW_HOURS = 72;
/** Quantas novidades o card mostra. */
export const ACTIVITY_LIMIT = 6;

export type ActivityKind = 'booked' | 'canceled';

export interface ActivitySourceRow {
  created_at: string;
  canceled_at: string | null;
  canceled_by: 'client' | 'professional' | null;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';
  origin: 'catalog' | 'professional' | 'record';
}

/** O que mostrar para um agendamento, ou `null` se não é novidade.
 *  - Cancelado pela cliente dentro da janela → "cancelou".
 *  - Feito pela cliente no catálogo dentro da janela e ainda de pé
 *    (aguardando ou confirmado) → "agendou".
 *  O que a própria profissional fez (manual, cancelar) não vira novidade. */
export function classifyActivity(
  row: ActivitySourceRow,
  since: Date
): { kind: ActivityKind; at: Date } | null {
  if (row.origin === 'record') return null;
  if (row.status === 'canceled') {
    if (row.canceled_by !== 'client' || !row.canceled_at) return null;
    const at = new Date(row.canceled_at);
    return at >= since ? { kind: 'canceled', at } : null;
  }
  // Concluído ou falta já não é novidade para o Início.
  if (row.origin !== 'catalog' || (row.status !== 'pending' && row.status !== 'confirmed')) return null;
  const at = new Date(row.created_at);
  return at >= since ? { kind: 'booked', at } : null;
}

/** "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias". */
export function relativeTimeLabel(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}
