import { supabaseAdmin } from '../supabase-admin';
import { normalizeWhatsappBR } from '../format';
import { priceToLabel } from '../service-format';
import { localDateTimeToUTC } from './availability';

/** Formato que as telas da Agenda (herdadas do StudioMenu) usam. Montado a
 *  partir de `appointments` + `clients` + `appointment_items` (F2.2); a F6
 *  refaz a Agenda e pode passar a usar os itens diretamente. */
export interface AgendaAppointment {
  id: string;
  /** Serviços do agendamento, juntos ("Volume russo + Design"). */
  service_title: string;
  duration_minutes: number;
  /** Total formatado ("R$ 180") ou null ("sob consulta"). */
  price_snapshot: string | null;
  client_name: string;
  /** Com o 55 do país, pronto para `wa.me`. */
  client_whatsapp: string;
  client_notes: string | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';
  origin: 'catalog' | 'professional';
}

export interface ManualBookingService {
  id: string;
  title: string;
  price: string;
  duration_minutes: number;
}

const AGENDA_SELECT =
  'id, starts_at, ends_at, status, origin, total_price, client_notes, clients(name, whatsapp), appointment_items(title, position)';

interface AgendaRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AgendaAppointment['status'];
  origin: AgendaAppointment['origin'];
  total_price: number | string | null;
  client_notes: string | null;
  clients: { name: string; whatsapp: string | null } | null;
  appointment_items: { title: string; position: number }[] | null;
}

function toAgendaAppointment(row: AgendaRow): AgendaAppointment {
  const items = [...(row.appointment_items || [])].sort((a, b) => a.position - b.position);
  const durationMinutes = Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000);
  return {
    id: row.id,
    service_title: items.map((i) => i.title).join(' + ') || 'Atendimento',
    duration_minutes: durationMinutes,
    price_snapshot: row.total_price === null ? null : priceToLabel(row.total_price),
    client_name: row.clients?.name || 'Cliente',
    client_whatsapp: normalizeWhatsappBR(row.clients?.whatsapp),
    client_notes: row.client_notes,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    origin: row.origin,
  };
}

/** Agendamentos entre `startDateStr` (inclusive) e `endDateStrExclusive`
 *  (exclusive), fuso America/Sao_Paulo, ordenados por horário. Nunca inclui
 *  cancelados (somem da agenda) nem registros de histórico (`record`, que não
 *  ocupam horário). Usada pela grade do dia e pela visão mensal. */
export async function getAppointmentsForRange(
  studioId: string,
  startDateStr: string,
  endDateStrExclusive: string
): Promise<AgendaAppointment[]> {
  const rangeStart = localDateTimeToUTC(startDateStr, '00:00:00');
  const rangeEnd = localDateTimeToUTC(endDateStrExclusive, '00:00:00');

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(AGENDA_SELECT)
    .eq('studio_id', studioId)
    .neq('status', 'canceled')
    .neq('origin', 'record')
    .gte('starts_at', rangeStart.toISOString())
    .lt('starts_at', rangeEnd.toISOString())
    .order('starts_at', { ascending: true });

  if (error) console.error('[agenda-service] getAppointmentsForRange:', error);
  return ((data as unknown as AgendaRow[]) || []).map(toAgendaAppointment);
}

/** Agendamentos de um único dia — atalho sobre `getAppointmentsForRange`. */
export async function getAppointmentsForDay(studioId: string, dateStr: string): Promise<AgendaAppointment[]> {
  const dayStart = localDateTimeToUTC(dateStr, '00:00:00');
  const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return getAppointmentsForRange(studioId, dateStr, nextDay);
}

/** Fila de agendamentos aguardando confirmação — sem filtro de data. */
export async function getPendingAppointments(studioId: string, limit = 50): Promise<AgendaAppointment[]> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(AGENDA_SELECT)
    .eq('studio_id', studioId)
    .eq('status', 'pending')
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (error) console.error('[agenda-service] getPendingAppointments:', error);
  return ((data as unknown as AgendaRow[]) || []).map(toAgendaAppointment);
}

/** Serviços que a profissional pode escolher num agendamento manual — todos
 *  os ativos, não só os `bookable` (ela marca o que quiser; a cliente final
 *  respeita `bookable`). */
export async function getManualBookingServices(studioId: string): Promise<ManualBookingService[]> {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('id, title, price, price_from, duration_minutes')
    .eq('studio_id', studioId)
    .eq('active', true)
    .order('position', { ascending: true });

  if (error) console.error('[agenda-service] getManualBookingServices:', error);
  return (data || []).map((s) => ({
    id: s.id as string,
    title: s.title as string,
    price: priceToLabel(s.price as number | string | null, Boolean(s.price_from)),
    duration_minutes: s.duration_minutes as number,
  }));
}
