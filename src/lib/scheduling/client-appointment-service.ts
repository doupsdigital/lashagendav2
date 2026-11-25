import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { normalizeWhatsappBR } from '../format';
import { toNumberOrNull } from '../service-format';
import { normalizeSlug } from '../studio-service';
import { clientCancelState, isValidManageToken, type ClientCancelState } from './client-appointment';

/** O que o link único da cliente mostra (F5.4). Nunca expõe dados de outras
 *  clientes nem o WhatsApp da própria cliente — só o agendamento do token. */
export interface ClientAppointmentView {
  id: string;
  token: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';
  startsAt: string;
  endsAt: string;
  clientFirstName: string;
  items: { title: string; durationMinutes: number; price: number | null }[];
  totalPrice: number | null;
  canceledBy: 'client' | 'professional' | null;
  /** Motivo que a profissional escreveu ao recusar/cancelar (F6.3). */
  cancelReason: string;
  cancel: ClientCancelState;
  cancellationNoticeHours: number;
  studio: {
    id: string;
    slug: string;
    name: string;
    ownerName: string;
    whatsapp: string;
    address: string;
    mapsUrl: string;
    themeVariant: 'rose' | 'luxury';
    postBookingMessage: string;
  };
}

interface Row {
  id: string;
  status: ClientAppointmentView['status'];
  starts_at: string;
  ends_at: string;
  total_price: number | string | null;
  canceled_by: 'client' | 'professional' | null;
  cancel_reason: string | null;
  manage_token: string;
  clients: { name: string } | null;
  appointment_items: { title: string; duration_minutes: number; price: number | string | null; position: number }[] | null;
  studios: {
    id: string;
    slug: string;
    studio_name: string | null;
    owner_name: string | null;
    whatsapp: string | null;
    address: string | null;
    maps_url: string | null;
    theme_variant: string | null;
    post_booking_message: string | null;
    cancellation_notice_hours: number;
    disabled: boolean;
  } | null;
}

const SELECT =
  'id, status, starts_at, ends_at, total_price, canceled_by, cancel_reason, manage_token, clients(name), ' +
  'appointment_items(title, duration_minutes, price, position), ' +
  'studios(id, slug, studio_name, owner_name, whatsapp, address, maps_url, theme_variant, post_booking_message, cancellation_notice_hours, disabled)';

/** Agendamento do link único. `null` se o token não existe, é de outro
 *  estúdio (slug não bate), é um registro de histórico ou o estúdio foi
 *  desativado. */
export async function getClientAppointment(slug: string, token: string, now: Date = new Date()): Promise<ClientAppointmentView | null> {
  if (!isValidManageToken(token)) return null;

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(SELECT)
    .eq('manage_token', token)
    .neq('origin', 'record')
    .maybeSingle();

  if (error) console.error('[client-appointment] getClientAppointment:', error);
  const row = data as unknown as Row | null;
  const studio = row?.studios;
  if (!row || !studio || studio.disabled || studio.slug !== normalizeSlug(slug)) return null;

  const ownerName = studio.owner_name || studio.slug;
  return {
    id: row.id,
    token: row.manage_token,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    clientFirstName: (row.clients?.name || '').trim().split(/\s+/)[0] || '',
    items: [...(row.appointment_items || [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ title: i.title, durationMinutes: i.duration_minutes, price: toNumberOrNull(i.price) })),
    totalPrice: toNumberOrNull(row.total_price),
    canceledBy: row.canceled_by,
    cancelReason: row.canceled_by === 'professional' ? (row.cancel_reason || '').trim() : '',
    cancel: clientCancelState(row.status, new Date(row.starts_at), studio.cancellation_notice_hours, now),
    cancellationNoticeHours: studio.cancellation_notice_hours,
    studio: {
      id: studio.id,
      slug: studio.slug,
      name: studio.studio_name || `Studio ${ownerName}`,
      ownerName,
      whatsapp: normalizeWhatsappBR(studio.whatsapp),
      address: studio.address || '',
      mapsUrl: studio.maps_url || '',
      themeVariant: studio.theme_variant === 'luxury' ? 'luxury' : 'rose',
      postBookingMessage: (studio.post_booking_message || '').trim(),
    },
  };
}
