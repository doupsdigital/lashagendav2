import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { cleanTechnical } from '@/lib/clients/client-technical';
import { cleanHealth } from '@/lib/clients/client-health';
import { saveClientSheetTab } from '@/lib/clients/client-sheet-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PUT /api/professional/clients/[id]/ficha — grava uma aba da ficha.
 *  Corpo: { slug, technical: {...} } (F8.1) ou { slug, health: {...} } (F8.2).
 *  A aba inteira de uma vez: campo que não vem fica vazio. */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-sheet:${ip}`, 60, 5 * 60))) {
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

    const hasTechnical = 'technical' in body;
    const hasHealth = 'health' in body;
    if (hasTechnical === hasHealth) return NextResponse.json({ success: false, message: 'Envie uma aba da ficha.' }, { status: 400 });
    const clean = hasTechnical ? cleanTechnical(body.technical) : cleanHealth(body.health);
    if (!clean.ok) return NextResponse.json({ success: false, message: clean.message }, { status: 400 });

    const result = await saveClientSheetTab(studio.id, id, hasTechnical ? { technical: clean.data } : { health: clean.data as Record<string, string | boolean> });
    if (result.ok) return NextResponse.json({ success: true });
    if (result.reason === 'not_found') return NextResponse.json({ success: false, message: 'Cliente não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: false, message: 'Não foi possível salvar. Tente de novo.' }, { status: 500 });
  } catch (error) {
    // Sem o corpo no log: a ficha é dado pessoal da cliente.
    console.error('[API Professional Client Sheet]:', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
