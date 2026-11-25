/** Histórico da cliente (F7.3): separa futuros e passados e monta o resumo.
 *  Arquivo puro (sem imports) — o `scripts/test-client-history.mjs` roda
 *  direto no Node. Valores em número; quem mostra formata (`formatBRL`). */

export interface HistoryAppointment {
  id: string;
  starts_at: string;
  status: string;
  origin: string;
  /** Soma dos preços na hora de agendar; null = sob consulta. */
  total_price: number | null;
  amount_received: number | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  /** Anotação da profissional. */
  notes?: string | null;
  /** Títulos dos serviços, na ordem. */
  services: string[];
}

export interface ClientHistorySummary {
  /** Atendimentos feitos (concluídos). */
  visits: number;
  /** Soma do valor recebido nos concluídos. */
  totalSpent: number;
  noShows: number;
  canceled: number;
  /** Primeiro aguardando/confirmado a partir de agora, ou null. */
  next: HistoryAppointment | null;
  /** Último concluído, ou null. */
  lastVisit: HistoryAppointment | null;
}

const ACTIVE = new Set(['pending', 'confirmed']);
const time = (a: HistoryAppointment) => new Date(a.starts_at).getTime();

/** Futuros: aguardando/confirmados que ainda não começaram, do mais perto ao
 *  mais longe. Passados: todo o resto (inclusive cancelados de datas futuras e
 *  ativos que já passaram sem ninguém concluir), do mais recente ao mais antigo. */
export function splitHistory(rows: HistoryAppointment[], now: Date): { upcoming: HistoryAppointment[]; past: HistoryAppointment[] } {
  const upcoming: HistoryAppointment[] = [];
  const past: HistoryAppointment[] = [];
  for (const r of rows) {
    if (ACTIVE.has(r.status) && time(r) >= now.getTime()) upcoming.push(r);
    else past.push(r);
  }
  upcoming.sort((a, b) => time(a) - time(b));
  past.sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}

export function summarizeHistory(rows: HistoryAppointment[], now: Date): ClientHistorySummary {
  const { upcoming } = splitHistory(rows, now);
  const done = rows.filter((r) => r.status === 'completed').sort((a, b) => time(b) - time(a));
  const cents = done.reduce((sum, r) => sum + Math.round((r.amount_received ?? 0) * 100), 0);
  return {
    visits: done.length,
    totalSpent: cents / 100,
    noShows: rows.filter((r) => r.status === 'no_show').length,
    canceled: rows.filter((r) => r.status === 'canceled').length,
    next: upcoming[0] ?? null,
    lastVisit: done[0] ?? null,
  };
}

/** Rótulo do que aconteceu, no histórico. */
export function historyStatusLabel(a: HistoryAppointment, now: Date): string {
  const passed = time(a) < now.getTime();
  switch (a.status) {
    case 'completed':
      return a.origin === 'record' ? 'Atendimento registrado' : 'Concluído';
    case 'no_show':
      return 'Faltou';
    case 'canceled':
      return a.canceled_by === 'client' ? 'Ela cancelou' : 'Você cancelou';
    case 'confirmed':
      return passed ? 'Confirmado · não marcado como concluído' : 'Confirmado';
    case 'pending':
      return passed ? 'Aguardando · já passou' : 'Aguardando sua confirmação';
    default:
      return a.status;
  }
}
