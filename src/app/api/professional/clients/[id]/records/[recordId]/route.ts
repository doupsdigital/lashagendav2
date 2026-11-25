import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { deleteRecord } from '@/lib/scheduling/booking-service';

interface RouteParams {
  params: Promise<{ id: string; recordId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** DELETE /api/professional/clients/[id]/records/[recordId]?slug= — apaga um
 *  atendimento registrado à mão (F7.4). Só `origin='record'`; agendamento de
 *  verdade dá 404 aqui (esses se cancelam pela agenda). */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-record-delete:${ip}`, 30, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    const { id, recordId } = await params;
    const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
    if (!slug) return NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 });
    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const studio = await getStudioBySlug(slug);
    if (!studio) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const ok = UUID_RE.test(id) && UUID_RE.test(recordId) && (await deleteRecord(studio.id, id, recordId));
    if (!ok) return NextResponse.json({ success: false, message: 'Registro não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Professional Client Record Delete]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
