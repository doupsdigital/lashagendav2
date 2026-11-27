import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { legacyWhatsappVariants, normalizeClientWhatsapp } from '../scheduling/client-phone';
import { sortClientsByName, summarizeVisits, type ClientAppointmentRow, type ClientListItem } from './client-list';
import type { HistoryAppointment } from './client-history';
import { toNumberOrNull } from '../service-format';

/** Leitura em páginas: o Supabase devolve no máximo 1000 linhas por vez. */
const PAGE = 1000;
const MAX_PAGES = 20;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, label: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error(`[client-service] ${label}:`, error);
      break;
    }
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

/** Todas as clientes do estúdio, por nome, com a quantidade de atendimentos
 *  feitos e a data do último (F7.1). */
export async function getClientList(studioId: string): Promise<ClientListItem[]> {
  const [clients, appointments] = await Promise.all([
    fetchAll<{ id: string; name: string; whatsapp_digits: string | null }>(
      (from, to) => supabaseAdmin.from('clients').select('id, name, whatsapp_digits').eq('studio_id', studioId).order('id').range(from, to),
      'clientes'
    ),
    fetchAll<ClientAppointmentRow>(
      (from, to) =>
        supabaseAdmin
          .from('appointments')
          .select('client_id, status, starts_at')
          .eq('studio_id', studioId)
          .eq('status', 'completed')
          .order('id')
          .range(from, to),
      'atendimentos'
    ),
  ]);

  const visits = summarizeVisits(appointments);
  return sortClientsByName(
    clients.map((c) => {
      const v = visits.get(c.id);
      return { id: c.id, name: c.name, whatsapp: c.whatsapp_digits || '', visits: v?.visits ?? 0, lastVisit: v?.lastVisit ?? null };
    })
  );
}

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; duplicate: { id: string; name: string } }
  | { ok: false; duplicate?: undefined };

/** Cadastro manual pela profissional (F7.1). Diferente do agendamento, aqui
 *  um WhatsApp que já existe NÃO reaproveita a cliente em silêncio — avisa
 *  quem é, para ela não cadastrar a mesma pessoa duas vezes. */
export async function createManualClient(studioId: string, name: string, whatsapp: string): Promise<CreateClientResult> {
  const digits = normalizeClientWhatsapp(whatsapp);

  const findExisting = async () => {
    if (!digits) return null;
    const candidates = [digits, ...legacyWhatsappVariants(digits)];
    const { data } = await supabaseAdmin
      .from('clients')
      .select('id, name, whatsapp_digits')
      .eq('studio_id', studioId)
      .in('whatsapp_digits', candidates);
    const rows = (data || []) as { id: string; name: string; whatsapp_digits: string }[];
    const best = candidates.map((c) => rows.find((r) => r.whatsapp_digits === c)).find(Boolean);
    return best ? { id: best.id, name: best.name } : null;
  };

  const existing = await findExisting();
  if (existing) return { ok: false, duplicate: existing };

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert({ studio_id: studioId, name, whatsapp: digits || null, source: 'manual' })
    .select('id')
    .single();
  if (!error && data) return { ok: true, id: data.id as string };
  if (error?.code === '23505') {
    const raced = await findExisting();
    if (raced) return { ok: false, duplicate: raced };
  }
  console.error('[client-service] createManualClient:', error);
  return { ok: false };
}

export interface ClientProfile {
  id: string;
  name: string;
  /** Só dígitos, sem o 55; vazio se não tem. */
  whatsapp: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  source: 'booking' | 'manual';
  created_at: string;
}

const PROFILE_SELECT = 'id, name, whatsapp_digits, email, birth_date, notes, source, created_at';

function toProfile(row: Record<string, unknown>): ClientProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    whatsapp: (row.whatsapp_digits as string) || '',
    email: (row.email as string) || null,
    birth_date: (row.birth_date as string) || null,
    notes: (row.notes as string) || null,
    source: row.source as 'booking' | 'manual',
    created_at: row.created_at as string,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Perfil de uma cliente do estúdio (F7.2); null se não é dela. */
export async function getClientProfile(studioId: string, clientId: string): Promise<ClientProfile | null> {
  if (!UUID_RE.test(clientId)) return null;
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select(PROFILE_SELECT)
    .eq('studio_id', studioId)
    .eq('id', clientId)
    .maybeSingle();
  if (error) console.error('[client-service] getClientProfile:', error);
  return data ? toProfile(data) : null;
}

/** Quantos agendamentos (de qualquer status) a cliente tem. */
export async function countClientAppointments(studioId: string, clientId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('client_id', clientId);
  if (error) {
    console.error('[client-service] countClientAppointments:', error);
    return -1;
  }
  return count || 0;
}

export type UpdateClientResult =
  | { ok: true; client: ClientProfile }
  | { ok: false; reason: 'not_found' | 'error' }
  | { ok: false; reason: 'duplicate'; duplicate: { id: string; name: string } };

/** Salva o perfil editado. `whatsapp` já vem normalizado e validado (ou vazio).
 *  Número que já é de OUTRA cliente → `duplicate`. */
export async function updateClientProfile(
  studioId: string,
  clientId: string,
  data: { name: string; whatsapp: string; email: string | null; birth_date: string | null; notes: string | null }
): Promise<UpdateClientResult> {
  if (!UUID_RE.test(clientId)) return { ok: false, reason: 'not_found' };

  const findOther = async () => {
    if (!data.whatsapp) return null;
    const candidates = [data.whatsapp, ...legacyWhatsappVariants(data.whatsapp)];
    const { data: rows } = await supabaseAdmin
      .from('clients')
      .select('id, name, whatsapp_digits')
      .eq('studio_id', studioId)
      .neq('id', clientId)
      .in('whatsapp_digits', candidates);
    const list = (rows || []) as { id: string; name: string; whatsapp_digits: string }[];
    const best = candidates.map((c) => list.find((r) => r.whatsapp_digits === c)).find(Boolean);
    return best ? { id: best.id, name: best.name } : null;
  };

  const other = await findOther();
  if (other) return { ok: false, reason: 'duplicate', duplicate: other };

  const { data: row, error } = await supabaseAdmin
    .from('clients')
    .update({ ...data, whatsapp: data.whatsapp || null })
    .eq('studio_id', studioId)
    .eq('id', clientId)
    .select(PROFILE_SELECT)
    .maybeSingle();
  if (!error && row) return { ok: true, client: toProfile(row) };
  if (!error) return { ok: false, reason: 'not_found' };
  if (error.code === '23505') {
    const raced = await findOther();
    if (raced) return { ok: false, reason: 'duplicate', duplicate: raced };
  }
  console.error('[client-service] updateClientProfile:', error);
  return { ok: false, reason: 'error' };
}

export type DeleteClientResult = { ok: true } | { ok: false; reason: 'not_found' | 'error' } | { ok: false; reason: 'has_history'; appointments: number };

/** Exclui a cliente — só se ela não tem nenhum agendamento (F7.2). O banco
 *  também trava (`ON DELETE RESTRICT`): se um agendamento entrar no meio, cai
 *  no 23503 e vira `has_history`. A ficha (`client_records`) sai junto. */
export async function deleteClient(studioId: string, clientId: string): Promise<DeleteClientResult> {
  if (!UUID_RE.test(clientId)) return { ok: false, reason: 'not_found' };
  const appointments = await countClientAppointments(studioId, clientId);
  if (appointments < 0) return { ok: false, reason: 'error' };
  if (appointments > 0) return { ok: false, reason: 'has_history', appointments };

  const { data, error } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('studio_id', studioId)
    .eq('id', clientId)
    .select('id');
  if (error?.code === '23503') {
    return { ok: false, reason: 'has_history', appointments: Math.max(1, await countClientAppointments(studioId, clientId)) };
  }
  if (error) {
    console.error('[client-service] deleteClient:', error);
    return { ok: false, reason: 'error' };
  }
  return data && data.length > 0 ? { ok: true } : { ok: false, reason: 'not_found' };
}

/** Todos os agendamentos da cliente (F7.3), com os serviços — até 500, do
 *  mais recente ao mais antigo (quem mostra separa futuros e passados). */
export async function getClientHistory(studioId: string, clientId: string): Promise<HistoryAppointment[]> {
  if (!UUID_RE.test(clientId)) return [];
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('id, starts_at, status, origin, total_price, amount_received, canceled_by, cancel_reason, notes, appointment_items(title, position)')
    .eq('studio_id', studioId)
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false })
    .limit(500);
  if (error) console.error('[client-service] getClientHistory:', error);
  return ((data || []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    starts_at: r.starts_at as string,
    status: r.status as string,
    origin: r.origin as string,
    total_price: toNumberOrNull(r.total_price as number | string | null),
    amount_received: toNumberOrNull(r.amount_received as number | string | null),
    canceled_by: (r.canceled_by as string) || null,
    cancel_reason: (r.cancel_reason as string) || null,
    notes: (r.notes as string) || null,
    services: [...((r.appointment_items as { title: string; position: number }[]) || [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.title),
  }));
}
