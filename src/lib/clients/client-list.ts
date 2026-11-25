/** Lista de clientes (F7.1): resumo de atendimentos e busca. Arquivo puro
 *  (sem imports) — o `scripts/test-client-list.mjs` roda direto no Node. */

export interface ClientListItem {
  id: string;
  name: string;
  /** Só dígitos, sem o 55 ("11999990000"); vazio se não tem. */
  whatsapp: string;
  /** Atendimentos feitos (status `completed`). */
  visits: number;
  /** Início do último atendimento feito (ISO), ou null. */
  lastVisit: string | null;
}

export interface ClientAppointmentRow {
  client_id: string | null;
  status: string;
  starts_at: string;
}

/** Conta os atendimentos feitos e acha o último de cada cliente. Só conta
 *  `completed` — aguardando, confirmado, falta e cancelado não são atendimento. */
export function summarizeVisits(rows: ClientAppointmentRow[]): Map<string, { visits: number; lastVisit: string | null }> {
  const out = new Map<string, { visits: number; lastVisit: string | null }>();
  for (const r of rows) {
    if (!r.client_id || r.status !== 'completed') continue;
    const cur = out.get(r.client_id) || { visits: 0, lastVisit: null };
    cur.visits += 1;
    if (!cur.lastVisit || new Date(r.starts_at).getTime() > new Date(cur.lastVisit).getTime()) cur.lastVisit = r.starts_at;
    out.set(r.client_id, cur);
  }
  return out;
}

/** Minúsculas e sem acento ("Júlia" → "julia"). */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Busca por nome (cada palavra digitada tem de aparecer, sem ligar para
 *  acento) ou por WhatsApp (só números, 3 ou mais, com ou sem o 55). */
export function matchesClientQuery(client: Pick<ClientListItem, 'name' | 'whatsapp'>, query: string): boolean {
  const text = normalizeSearchText(query);
  if (!text) return true;
  const compact = text.replace(/[\s()+.-]/g, '');
  if (/^\d{3,}$/.test(compact)) {
    const digits = compact.replace(/^55(?=\d{10,11}$)/, '');
    return client.whatsapp.includes(digits);
  }
  const name = normalizeSearchText(client.name);
  return text.split(' ').every((word) => name.includes(word));
}

/** Ordem da lista: por nome, como no dicionário (acento não muda a posição). */
export function sortClientsByName<T extends { name: string }>(clients: T[]): T[] {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
}

/** "1 atendimento · último em 12/03/2026", "Nenhum atendimento ainda". */
export function visitsLabel(visits: number, lastVisit: string | null): string {
  if (!visits) return 'Nenhum atendimento ainda';
  const count = visits === 1 ? '1 atendimento' : `${visits} atendimentos`;
  if (!lastVisit) return count;
  const date = new Date(lastVisit).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  return `${count} · último em ${date}`;
}

export const MAX_CLIENT_NAME = 120;

/** Nome digitado para a cliente nova: sem espaços sobrando; null se curto
 *  demais (menos de 2 letras). */
export function cleanClientName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CLIENT_NAME);
  return name.length >= 2 ? name : null;
}
