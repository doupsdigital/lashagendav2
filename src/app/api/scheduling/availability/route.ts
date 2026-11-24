import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getStudioBySlug } from '@/lib/studio-service';
import { isBookingLive } from '@/lib/studio-access';
import { getAvailableSlotsForDate } from '@/lib/scheduling/slot-lookup';
import { loadBookingItems, parseItemsParam, totalDurationMinutes } from '@/lib/scheduling/booking-service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/scheduling/availability?slug=X&items=serv[:var],serv2&date=YYYY-MM-DD
 *  (ou o formato antigo `service_id=Y[&variation_id=Z]`, um serviço só).
 *  Vários serviços = um atrás do outro: a duração é a soma.
 *  Pública (modal de agendamento do catálogo, sem login), rate-limited. */
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`scheduling-availability:${ip}`, 60, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas requisições. Tente novamente em instantes.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || '';
    const serviceId = searchParams.get('service_id') || '';
    const refs = searchParams.get('items')
      ? parseItemsParam(searchParams.get('items'))
      : serviceId
        ? [{ service_id: serviceId, variation_id: searchParams.get('variation_id') }]
        : [];
    const dateStr = searchParams.get('date') || '';

    if (!slug || refs.length === 0 || !DATE_RE.test(dateStr)) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros inválidos (slug, items e date são obrigatórios).' },
        { status: 400 }
      );
    }

    const studio = await getStudioBySlug(slug);
    if (!studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    if (!isBookingLive(studio)) {
      return NextResponse.json({ success: false, message: 'A agenda online está fechada no momento. Fale com a profissional pelo WhatsApp.' }, { status: 400 });
    }

    const items = await loadBookingItems(studio.id, refs, { requireBookable: true });
    if (!items) {
      return NextResponse.json({ success: false, message: 'Serviço não encontrado.' }, { status: 404 });
    }
    const durationMinutes = totalDurationMinutes(items);

    // Nenhum horário de atendimento cadastrado ainda: avisa "ainda não
    // configurado" em vez de parecer que todos os dias estão lotados.
    const { count: hoursCount } = await supabaseAdmin
      .from('business_hours')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studio.id);

    if (!hoursCount) {
      return NextResponse.json({ success: true, slots: [], noSchedulingYet: true, durationMinutes });
    }

    const slots = await getAvailableSlotsForDate(studio.id, dateStr, durationMinutes, studio);
    return NextResponse.json({ success: true, slots, durationMinutes, bookingWindowDays: studio.booking_window_days });
  } catch (error) {
    console.error('[API Scheduling Availability Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno ao calcular disponibilidade.' }, { status: 500 });
  }
}
