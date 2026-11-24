import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { isSlotAvailableForBooking } from '@/lib/scheduling/slot-lookup';
import { createAppointment, findOrCreateClient, loadBookingItem } from '@/lib/scheduling/booking-service';
import { INVALID_WHATSAPP_MESSAGE, isValidClientWhatsapp, normalizeClientWhatsapp } from '@/lib/scheduling/client-phone';

/** POST /api/professional/appointments
 *  Agendamento manual criado pela própria profissional (walk-in, telefone,
 *  etc) — diferente de `/api/scheduling/book` (público, cliente final), este
 *  exige sessão autenticada e já nasce `confirmed`.
 *  Body: { slug, service_id, variation_id?, starts_at, client_name, client_whatsapp, client_notes? } */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-manual-booking:${ip}`, 20, 5 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const { slug, service_id, variation_id, starts_at, client_name, client_whatsapp, client_notes } = body as {
      slug?: string;
      service_id?: string;
      variation_id?: string;
      starts_at?: string;
      client_name?: string;
      client_whatsapp?: string;
      client_notes?: string;
    };

    if (!slug || !service_id || !starts_at || !client_name?.trim() || !client_whatsapp?.trim()) {
      return NextResponse.json({ success: false, message: 'Preencha serviço, horário, nome e WhatsApp.' }, { status: 400 });
    }

    if (!isValidClientWhatsapp(normalizeClientWhatsapp(client_whatsapp))) {
      return NextResponse.json({ success: false, message: INVALID_WHATSAPP_MESSAGE }, { status: 400 });
    }

    const normalizedSlug = normalizeSlug(slug);
    if (!(await isProfessionalRequestAuthorized(normalizedSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const startsAtDate = new Date(starts_at);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Horário inválido.' }, { status: 400 });
    }

    const studio = await getStudioBySlug(normalizedSlug);
    if (!studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    const item = await loadBookingItem(studio.id, service_id, variation_id, { requireBookable: false });
    if (!item) {
      return NextResponse.json({ success: false, message: 'Serviço não encontrado.' }, { status: 400 });
    }

    // Respeita o horário de atendimento e os bloqueios dela — pode marcar
    // qualquer horário, mas não se auto-conflitar sem perceber. Instante
    // exato (não a grade de 30min) e sem folga de "hoje".
    const dateStr = startsAtDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const isAvailable = await isSlotAvailableForBooking(studio.id, startsAtDate, dateStr, item.durationMinutes);
    if (!isAvailable) {
      return NextResponse.json(
        { success: false, message: 'Esse horário está fora do expediente ou bloqueado. Ajuste em Config se precisar liberar.' },
        { status: 409 }
      );
    }

    const clientId = await findOrCreateClient(studio.id, client_name, client_whatsapp, 'manual');
    if (!clientId) {
      return NextResponse.json({ success: false, message: 'Erro ao criar o agendamento.' }, { status: 500 });
    }

    const result = await createAppointment({
      studioId: studio.id,
      clientId,
      startsAt: startsAtDate,
      items: [item],
      status: 'confirmed',
      origin: 'professional',
      clientNotes: client_notes,
    });

    if (!result.ok) {
      if (result.reason === 'conflict') {
        return NextResponse.json({ success: false, message: 'Já existe um agendamento nesse horário.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, message: 'Erro ao criar o agendamento.' }, { status: 500 });
    }

    const { manage_token: _manageToken, ...appointment } = result.appointment;
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('[API Professional Appointments Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
