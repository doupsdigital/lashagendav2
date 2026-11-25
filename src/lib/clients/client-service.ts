import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { legacyWhatsappVariants, normalizeClientWhatsapp } from '../scheduling/client-phone';
import { sortClientsByName, summarizeVisits, type ClientAppointmentRow, type ClientListItem } from './client-list';

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
