import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { giveClientConsent, revokeClientConsent } from '@/lib/clients/client-sheet-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handle(request: Request, { params }: RouteParams, slugRaw: unknown, action: 'give' | 'revoke') {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-consent:${ip}`, 30, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    const { id } = await params;
    const slug = normalizeSlug(typeof slugRaw === 'string' ? slugRaw : '');
    if (!slug) return NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 });
    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const studio = await getStudioBySlug(slug);
    if (!studio) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const result = action === 'give' ? await giveClientConsent(studio.id, id) : await revokeClientConsent(studio.id, id);
    if (result.ok) return NextResponse.json({ success: true, consent_at: result.consent_at });
    if (result.reason === 'not_found') return NextResponse.json({ success: false, message: 'Cliente não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: false, message: 'Não foi possível salvar. Tente de novo.' }, { status: 500 });
  } catch (error) {
    console.error('[API Professional Client Consent]:', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}

/** POST /api/professional/clients/[id]/ficha/consent — registra a autorização
 *  da cliente para guardar os dados de saúde (F8.3). Corpo: { slug }. */
export async function POST(request: Request, ctx: RouteParams) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return handle(request, ctx, body.slug, 'give');
}

/** DELETE /api/professional/clients/[id]/ficha/consent?slug= — retira a
 *  autorização e apaga as respostas de saúde (a ficha técnica fica). */
export async function DELETE(request: Request, ctx: RouteParams) {
  return handle(request, ctx, new URL(request.url).searchParams.get('slug'), 'revoke');
}
