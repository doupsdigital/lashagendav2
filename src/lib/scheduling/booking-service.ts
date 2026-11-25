import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { toNumberOrNull } from '../service-format';
import { legacyWhatsappVariants, normalizeClientWhatsapp } from './client-phone';
import type { AppointmentOrigin, AppointmentStatus } from '@/types/studio';
import { localDateTimeToUTC } from './availability';
import { MAX_RECORD_NOTES, RECORD_TIME } from '../clients/client-record';

/** Gravação de agendamentos no modelo v2 (F2.2): cliente (com dedupe por
 *  WhatsApp) + `appointments` + `appointment_items`. Fonte única usada pelo
 *  agendamento da cliente final e pelo agendamento manual da profissional. */

/** Acha a cliente do estúdio pelo WhatsApp ou cria uma nova (F5.2).
 *  - o número é normalizado (`client-phone.ts`): com/sem 55, 0, 9, máscara;
 *  - cliente existente NÃO tem o nome trocado pelo que foi digitado agora —
 *    o cadastro é da profissional;
 *  - duas requisições simultâneas criando a mesma cliente: a segunda bate no
 *    índice único (23505) e reaproveita quem ganhou a corrida.
 *  Quem chama valida o número antes (`isValidClientWhatsapp`). */
export async function findOrCreateClient(
  studioId: string,
  name: string,
  whatsapp: string,
  source: 'booking' | 'manual'
): Promise<string | null> {
  const digits = normalizeClientWhatsapp(whatsapp);
  const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 120);

  const findExisting = async () => {
    if (!digits) return null;
    // A forma atual primeiro; depois as antigas (celular salvo sem o 9).
    const candidates = [digits, ...legacyWhatsappVariants(digits)];
    const { data } = await supabaseAdmin
      .from('clients')
      .select('id, whatsapp_digits')
      .eq('studio_id', studioId)
      .in('whatsapp_digits', candidates);
    const rows = (data || []) as { id: string; whatsapp_digits: string }[];
    const best = candidates.map((c) => rows.find((r) => r.whatsapp_digits === c)).find(Boolean);
    return best?.id ?? null;
  };

  const existing = await findExisting();
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert({ studio_id: studioId, name: cleanName, whatsapp: digits || null, source })
    .select('id')
    .single();

  if (!error && data) return data.id as string;
  if (error?.code === '23505') return findExisting();
  console.error('[booking-service] Erro ao criar cliente:', error);
  return null;
}

export interface BookingItem {
  serviceId: string;
  variationId: string | null;
  title: string;
  durationMinutes: number;
  price: number | null;
}

/** Serviço (e variação, se escolhida) do estúdio pronto para virar item de
 *  agendamento. `requireBookable` = agendamento pela cliente final (respeita
 *  "não agendável"); a profissional pode marcar qualquer serviço ativo. */
export async function loadBookingItem(
  studioId: string,
  serviceId: string,
  variationId: string | null | undefined,
  options: { requireBookable: boolean }
): Promise<BookingItem | null> {
  const { data: service } = await supabaseAdmin
    .from('services')
    .select('id, title, price, duration_minutes, bookable, active')
    .eq('id', serviceId)
    .eq('studio_id', studioId)
    .maybeSingle();

  if (!service || !service.active) return null;
  if (options.requireBookable && !service.bookable) return null;

  if (variationId) {
    const { data: variation } = await supabaseAdmin
      .from('service_variations')
      .select('id, name, price, duration_minutes')
      .eq('id', variationId)
      .eq('service_id', service.id)
      .maybeSingle();
    if (!variation) return null;
    return {
      serviceId: service.id as string,
      variationId: variation.id as string,
      title: `${service.title} — ${variation.name}`,
      durationMinutes: variation.duration_minutes as number,
      price: toNumberOrNull(variation.price as number | string | null),
    };
  }

  // Serviço com opções exige escolher uma (F6.4): sem isso entraria a
  // duração/preço "genéricos" do serviço, que não valem para nenhuma opção.
  const { count: variationCount } = await supabaseAdmin
    .from('service_variations')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', service.id);
  if ((variationCount ?? 0) > 0) return null;

  return {
    serviceId: service.id as string,
    variationId: null,
    title: service.title as string,
    durationMinutes: service.duration_minutes as number,
    price: toNumberOrNull(service.price as number | string | null),
  };
}

/** Tamanho máximo da observação da cliente. */
export const MAX_CLIENT_NOTES = 500;

/** Máximo de serviços num mesmo agendamento pela cliente (F5.1). */
export const MAX_BOOKING_ITEMS = 5;

export interface BookingItemRef {
  service_id: string;
  variation_id?: string | null;
}

/** Lista de serviços pedida pela cliente → itens prontos, na ordem pedida.
 *  `null` se a lista for vazia/grande demais, repetir um serviço ou algum
 *  item não existir/não for agendável. */
export async function loadBookingItems(
  studioId: string,
  refs: BookingItemRef[],
  options: { requireBookable: boolean }
): Promise<BookingItem[] | null> {
  if (!Array.isArray(refs) || refs.length === 0 || refs.length > MAX_BOOKING_ITEMS) return null;
  const serviceIds = refs.map((r) => r?.service_id);
  if (serviceIds.some((id) => typeof id !== 'string' || !id)) return null;
  if (new Set(serviceIds).size !== serviceIds.length) return null;

  const items = await Promise.all(
    refs.map((r) => loadBookingItem(studioId, r.service_id, r.variation_id || null, options))
  );
  return items.every(Boolean) ? (items as BookingItem[]) : null;
}

/** `?items=servico:variacao,servico2` (formato da rota de horários). */
export function parseItemsParam(value: string | null): BookingItemRef[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [service_id, variation_id] = part.split(':');
      return { service_id, variation_id: variation_id || null };
    });
}

export function totalDurationMinutes(items: BookingItem[]): number {
  return items.reduce((sum, i) => sum + i.durationMinutes, 0);
}

/** Soma dos preços; `null` se nenhum item tem preço ("sob consulta"). */
export function totalPrice(items: BookingItem[]): number | null {
  const priced = items.filter((i) => i.price !== null);
  if (priced.length === 0) return null;
  return Math.round(priced.reduce((sum, i) => sum + (i.price as number), 0) * 100) / 100;
}

export interface CreateAppointmentInput {
  studioId: string;
  clientId: string;
  startsAt: Date;
  items: BookingItem[];
  status: Extract<AppointmentStatus, 'pending' | 'confirmed'>;
  origin: Exclude<AppointmentOrigin, 'record'>;
  clientNotes?: string | null;
  /** Anotação da profissional (agendamento manual, F6.4). */
  notes?: string | null;
}

export type CreateAppointmentResult =
  | { ok: true; appointment: { id: string; starts_at: string; ends_at: string; status: string; manage_token: string } }
  | { ok: false; reason: 'conflict' | 'error' };

/** Grava o agendamento e os itens. Sem transação pela API REST: se os itens
 *  falharem, apaga o agendamento recém-criado. A trava de choque de horário
 *  do banco (`appointments_no_overlap`, erro 23P01) é a garantia final. */
export async function createAppointment(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
  const endsAt = new Date(input.startsAt.getTime() + totalDurationMinutes(input.items) * 60000);

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      studio_id: input.studioId,
      client_id: input.clientId,
      starts_at: input.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: input.status,
      origin: input.origin,
      total_price: totalPrice(input.items),
      client_notes: input.clientNotes?.trim().slice(0, MAX_CLIENT_NOTES) || null,
      notes: input.notes?.trim().slice(0, MAX_CLIENT_NOTES) || null,
    })
    .select('id, starts_at, ends_at, status, manage_token')
    .single();

  if (error || !appointment) {
    if ((error as { code?: string } | null)?.code === '23P01') return { ok: false, reason: 'conflict' };
    console.error('[booking-service] Erro ao inserir agendamento:', error);
    return { ok: false, reason: 'error' };
  }

  const { error: itemsError } = await supabaseAdmin.from('appointment_items').insert(
    input.items.map((item, position) => ({
      appointment_id: appointment.id,
      position,
      service_id: item.serviceId,
      variation_id: item.variationId,
      title: item.title,
      duration_minutes: item.durationMinutes,
      price: item.price,
    }))
  );

  if (itemsError) {
    console.error('[booking-service] Erro ao inserir itens do agendamento:', itemsError);
    await supabaseAdmin.from('appointments').delete().eq('id', appointment.id);
    return { ok: false, reason: 'error' };
  }

  return {
    ok: true,
    appointment: appointment as { id: string; starts_at: string; ends_at: string; status: string; manage_token: string },
  };
}

export interface CreateRecordInput {
  studioId: string;
  clientId: string;
  /** "AAAA-MM-DD", já validada (`recordDateProblem`). */
  date: string;
  items: BookingItem[];
  /** null = usar o total (ou nada, se sob consulta). */
  amountReceived: number | null;
  notes?: string | null;
}

/** Atendimento registrado à mão (F7.4): `origin='record'`, já `completed`,
 *  ao meio-dia da data. Não passa pela trava de horário (o banco ignora
 *  `record`), então nunca dá conflito. */
export async function createRecord(input: CreateRecordInput): Promise<{ ok: true; id: string } | { ok: false }> {
  const startsAt = localDateTimeToUTC(input.date, RECORD_TIME);
  const endsAt = new Date(startsAt.getTime() + Math.max(5, totalDurationMinutes(input.items)) * 60000);
  const total = totalPrice(input.items);

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      studio_id: input.studioId,
      client_id: input.clientId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'completed',
      origin: 'record',
      total_price: total,
      amount_received: input.amountReceived ?? total,
      notes: input.notes?.trim().slice(0, MAX_RECORD_NOTES) || null,
    })
    .select('id')
    .single();
  if (error || !appointment) {
    console.error('[booking-service] Erro ao registrar atendimento:', error);
    return { ok: false };
  }

  const { error: itemsError } = await supabaseAdmin.from('appointment_items').insert(
    input.items.map((item, position) => ({
      appointment_id: appointment.id,
      position,
      service_id: item.serviceId,
      variation_id: item.variationId,
      title: item.title,
      duration_minutes: item.durationMinutes,
      price: item.price,
    }))
  );
  if (itemsError) {
    console.error('[booking-service] Erro ao inserir itens do registro:', itemsError);
    await supabaseAdmin.from('appointments').delete().eq('id', appointment.id);
    return { ok: false };
  }
  return { ok: true, id: appointment.id as string };
}

/** Apaga um atendimento registrado à mão (F7.4) — só `record`; agendamentos
 *  de verdade se cancelam pela agenda, nunca somem. */
export async function deleteRecord(studioId: string, clientId: string, recordId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('studio_id', studioId)
    .eq('client_id', clientId)
    .eq('id', recordId)
    .eq('origin', 'record')
    .select('id');
  if (error) console.error('[booking-service] deleteRecord:', error);
  return Boolean(data && data.length > 0);
}
