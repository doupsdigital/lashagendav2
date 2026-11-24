import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getStudioBySlug } from '@/lib/studio-service';
import { isBookingLive } from '@/lib/studio-access';
import { getAvailableSlotsForDate } from '@/lib/scheduling/slot-lookup';
import { createAppointment, findOrCreateClient, loadBookingItem } from '@/lib/scheduling/booking-service';
import { priceToLabel } from '@/lib/service-format';
import { sendPushToStudio } from '@/lib/push-notifications';

/** POST /api/scheduling/book
 *  Pública (a cliente final não tem conta — só nome + WhatsApp), rate-limited.
 *  Body: { slug, service_id, variation_id?, starts_at (ISO), client_name, client_whatsapp, client_notes? } */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`scheduling-book:${ip}`, 10, 300);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
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
      return NextResponse.json({ success: false, message: 'Preencha nome, WhatsApp e escolha um horário.' }, { status: 400 });
    }

    const startsAtDate = new Date(starts_at);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Horário inválido.' }, { status: 400 });
    }

    const studio = await getStudioBySlug(slug);
    if (!studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    if (!isBookingLive(studio)) {
      return NextResponse.json({ success: false, message: 'Agendamento automático não está ativo pra este catálogo.' }, { status: 400 });
    }

    const item = await loadBookingItem(studio.id, service_id, variation_id, { requireBookable: true });
    if (!item) {
      return NextResponse.json({ success: false, message: 'Serviço indisponível pra agendamento automático.' }, { status: 400 });
    }

    // Revalida o horário antes de gravar (a lista do navegador pode estar
    // desatualizada). A garantia final contra corrida é a trava do banco.
    const dateStr = startsAtDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
    const slots = await getAvailableSlotsForDate(studio.id, dateStr, item.durationMinutes);
    if (!slots.some((s) => s.startsAt === startsAtDate.toISOString())) {
      return NextResponse.json(
        { success: false, message: 'Esse horário não está mais disponível. Escolha outro, por favor.' },
        { status: 409 }
      );
    }

    const clientId = await findOrCreateClient(studio.id, client_name, client_whatsapp, 'booking');
    if (!clientId) {
      return NextResponse.json({ success: false, message: 'Erro ao confirmar o agendamento.' }, { status: 500 });
    }

    // Modo automático confirma na hora; com aprovação fica aguardando ela.
    const result = await createAppointment({
      studioId: studio.id,
      clientId,
      startsAt: startsAtDate,
      items: [item],
      status: studio.booking_mode === 'auto' ? 'confirmed' : 'pending',
      origin: 'catalog',
      clientNotes: client_notes,
    });

    if (!result.ok) {
      if (result.reason === 'conflict') {
        return NextResponse.json(
          { success: false, message: 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, message: 'Erro ao confirmar o agendamento.' }, { status: 500 });
    }

    // Push só para agendamentos feitos pela cliente. Dia e hora no fuso de
    // São Paulo (o servidor roda em UTC).
    const weekday = startsAtDate.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '');
    const dayMonth = startsAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const time = startsAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

    await sendPushToStudio(studio.id, {
      title: '📅 Novo agendamento',
      body: `${client_name.trim()} · ${item.title} · ${weekday}, ${dayMonth} às ${time}`,
      url: `/app/${studio.slug}/agenda#pendentes`,
    });

    const { manage_token: _manageToken, ...appointment } = result.appointment;
    return NextResponse.json({
      success: true,
      appointment,
      service: { title: item.title, price: priceToLabel(item.price) },
    });
  } catch (error) {
    console.error('[API Scheduling Book Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno ao criar o agendamento.' }, { status: 500 });
  }
}
