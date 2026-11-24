import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getStudioBySlug } from '@/lib/studio-service';
import { isBookingLive } from '@/lib/studio-access';
import { priceToLabel } from '@/lib/service-format';
import { getAvailableSlotsForDate } from '@/lib/scheduling/slot-lookup';
import { loadBookingItem } from '@/lib/scheduling/booking-service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/scheduling/availability?slug=X&service_id=Y[&variation_id=Z]&date=YYYY-MM-DD
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
    const variationId = searchParams.get('variation_id');
    const dateStr = searchParams.get('date') || '';

    if (!slug || !serviceId || !DATE_RE.test(dateStr)) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros inválidos (slug, service_id, date são obrigatórios).' },
        { status: 400 }
      );
    }

    const studio = await getStudioBySlug(slug);
    if (!studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    if (!isBookingLive(studio)) {
      return NextResponse.json({ success: false, message: 'Agendamento automático não está ativo pra este catálogo.' }, { status: 400 });
    }

    const item = await loadBookingItem(studio.id, serviceId, variationId, { requireBookable: true });
    if (!item) {
      return NextResponse.json({ success: false, message: 'Serviço não encontrado.' }, { status: 404 });
    }
    const service = { id: item.serviceId, title: item.title, price: priceToLabel(item.price) };

    // Nenhum horário de atendimento cadastrado ainda: avisa "ainda não
    // configurado" em vez de parecer que todos os dias estão lotados.
    const { count: hoursCount } = await supabaseAdmin
      .from('business_hours')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studio.id);

    if (!hoursCount) {
      return NextResponse.json({ success: true, slots: [], noSchedulingYet: true, service });
    }

    const slots = await getAvailableSlotsForDate(studio.id, dateStr, item.durationMinutes);
    return NextResponse.json({ success: true, slots, service });
  } catch (error) {
    console.error('[API Scheduling Availability Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno ao calcular disponibilidade.' }, { status: 500 });
  }
}
