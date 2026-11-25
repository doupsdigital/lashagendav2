import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { getClientProfile } from '@/lib/clients/client-service';
import { recordDateProblem } from '@/lib/clients/client-record';
import { parseAmountReceived } from '@/lib/scheduling/appointment-actions';
import { createRecord, loadBookingItems, type BookingItemRef } from '@/lib/scheduling/booking-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/professional/clients/[id]/records — registra um atendimento feito
 *  fora do app (F7.4). Corpo: { slug, date, items: [{service_id, variation_id?}],
 *  amount_received?, notes? }. Vale qualquer serviço ativo (até 5). */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-record:${ip}`, 30, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const slug = normalizeSlug(typeof body.slug === 'string' ? body.slug : '');
    if (!slug) return NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 });
    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const studio = await getStudioBySlug(slug);
    if (!studio) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const client = await getClientProfile(studio.id, id);
    if (!client) return NextResponse.json({ success: false, message: 'Cliente não encontrada.' }, { status: 404 });

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const dateProblem = recordDateProblem(body.date, today);
    if (dateProblem) return NextResponse.json({ success: false, message: dateProblem }, { status: 400 });

    const items = await loadBookingItems(studio.id, (body.items as BookingItemRef[]) || [], { requireBookable: false });
    if (!items) {
      return NextResponse.json(
        { success: false, message: 'Confira os serviços (escolha a opção dos que têm opções, sem repetir).' },
        { status: 400 }
      );
    }

    const amount = parseAmountReceived(body.amount_received);
    if (amount === undefined) return NextResponse.json({ success: false, message: 'Valor recebido inválido.' }, { status: 400 });

    const result = await createRecord({
      studioId: studio.id,
      clientId: client.id,
      date: body.date as string,
      items,
      amountReceived: amount,
      notes: typeof body.notes === 'string' ? body.notes : null,
    });
    if (!result.ok) return NextResponse.json({ success: false, message: 'Não foi possível registrar. Tente de novo.' }, { status: 500 });
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('[API Professional Client Record]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
