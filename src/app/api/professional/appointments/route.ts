import { NextResponse } from 'next/server';
import { lapsedResponseForSlug } from '@/lib/access-guard';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { getInstantProblem } from '@/lib/scheduling/slot-lookup';
import {
  createAppointment,
  findOrCreateClient,
  loadBookingItems,
  totalDurationMinutes,
  type BookingItemRef,
} from '@/lib/scheduling/booking-service';
import { getStudioClient } from '@/lib/scheduling/agenda-service';
import { INVALID_WHATSAPP_MESSAGE, isValidClientWhatsapp, normalizeClientWhatsapp } from '@/lib/scheduling/client-phone';

const OUTSIDE_MESSAGE = {
  outside_hours: 'Esse horário fica fora do seu expediente.',
  blocked: 'Esse horário está trancado na sua agenda.',
} as const;

/** POST /api/professional/appointments
 *  Agendamento manual criado pela própria profissional (walk-in, telefone,
 *  etc) — diferente de `/api/scheduling/book` (público, cliente final), este
 *  exige sessão autenticada e já nasce `confirmed`.
 *  Body (F6.4): { slug, items: [{ service_id, variation_id? }] (ou service_id/variation_id),
 *  starts_at, client_id (cliente já cadastrada) OU client_name + client_whatsapp,
 *  notes?, allow_outside_hours? }.
 *  Choque com outro agendamento nunca passa. Fora do expediente ou em horário
 *  trancado: responde `needsConfirmation` e só grava com `allow_outside_hours`. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-manual-booking:${ip}`, 20, 5 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const { slug, items: itemsInput, service_id, variation_id, starts_at, client_id, client_name, client_whatsapp, notes, client_notes, allow_outside_hours } =
      body as {
        slug?: string;
        items?: BookingItemRef[];
        service_id?: string;
        variation_id?: string;
        starts_at?: string;
        client_id?: string;
        client_name?: string;
        client_whatsapp?: string;
        notes?: string;
        /** Nome antigo do campo de anotação. */
        client_notes?: string;
        allow_outside_hours?: boolean;
      };

    const refs: BookingItemRef[] = Array.isArray(itemsInput) ? itemsInput : service_id ? [{ service_id, variation_id }] : [];
    const hasClient = Boolean(client_id) || Boolean(client_name?.trim() && client_whatsapp?.trim());
    if (!slug || refs.length === 0 || !starts_at || !hasClient) {
      return NextResponse.json({ success: false, message: 'Preencha cliente, serviço e horário.' }, { status: 400 });
    }

    if (!client_id && !isValidClientWhatsapp(normalizeClientWhatsapp(client_whatsapp || ''))) {
      return NextResponse.json({ success: false, message: INVALID_WHATSAPP_MESSAGE }, { status: 400 });
    }

    const normalizedSlug = normalizeSlug(slug);
    if (!(await isProfessionalRequestAuthorized(normalizedSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const lapsed = await lapsedResponseForSlug(normalizedSlug);
    if (lapsed) return lapsed;

    const startsAtDate = new Date(starts_at);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Horário inválido.' }, { status: 400 });
    }

    const studio = await getStudioBySlug(normalizedSlug);
    if (!studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    const items = await loadBookingItems(studio.id, refs, { requireBookable: false });
    if (!items) {
      return NextResponse.json(
        { success: false, message: 'Confira os serviços: até 5, sem repetir, e escolha a opção quando o serviço tiver.' },
        { status: 400 }
      );
    }

    const dateStr = startsAtDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const problem = await getInstantProblem(studio.id, startsAtDate, dateStr, totalDurationMinutes(items));
    if (problem === 'conflict') {
      return NextResponse.json(
        { success: false, reason: 'conflict', message: 'Já existe um agendamento nesse horário. Escolha outro horário.' },
        { status: 409 }
      );
    }
    if (problem === 'invalid') {
      return NextResponse.json({ success: false, message: 'Duração dos serviços inválida.' }, { status: 400 });
    }
    if ((problem === 'outside_hours' || problem === 'blocked') && allow_outside_hours !== true) {
      return NextResponse.json(
        { success: false, needsConfirmation: true, reason: problem, message: OUTSIDE_MESSAGE[problem] },
        { status: 409 }
      );
    }

    let clientId: string | null = null;
    if (client_id) {
      clientId = (await getStudioClient(studio.id, client_id))?.id ?? null;
      if (!clientId) return NextResponse.json({ success: false, message: 'Cliente não encontrada.' }, { status: 400 });
    } else {
      clientId = await findOrCreateClient(studio.id, client_name || '', client_whatsapp || '', 'manual');
      if (!clientId) return NextResponse.json({ success: false, message: 'Erro ao criar o agendamento.' }, { status: 500 });
    }

    const result = await createAppointment({
      studioId: studio.id,
      clientId,
      startsAt: startsAtDate,
      items,
      status: 'confirmed',
      origin: 'professional',
      notes: notes ?? client_notes,
    });

    if (!result.ok) {
      if (result.reason === 'conflict') {
        return NextResponse.json({ success: false, reason: 'conflict', message: 'Já existe um agendamento nesse horário.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, message: 'Erro ao criar o agendamento.' }, { status: 500 });
    }

    const { manage_token: _manageToken, ...appointment } = result.appointment;
    return NextResponse.json({ success: true, appointment, outsideHours: problem !== null });
  } catch (error) {
    console.error('[API Professional Appointments Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
