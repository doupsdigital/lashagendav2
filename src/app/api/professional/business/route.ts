import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { isPreviewStudio } from '@/lib/studio-access';
import { saveBusinessProfile } from '@/lib/studio/business-service';

/** PUT /api/professional/business (F10.1)
 *  Body: { slug, owner_name, studio_name, whatsapp, instagram, address, maps_url }
 *  "Meu negócio" da Config. Grava nas mesmas colunas do editor do catálogo. */
export async function PUT(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-business:${ip}`, 30, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const slug = typeof body?.slug === 'string' ? body.slug.toLowerCase().trim() : '';
    if (!body || !slug) return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });

    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { data: studio } = await supabaseAdmin.from('studios').select('id, plan_status').eq('slug', slug).maybeSingle();
    if (!studio) return NextResponse.json({ success: false, message: 'Estúdio não encontrado.' }, { status: 404 });
    // Mesma regra do editor do catálogo: a prévia não edita.
    if (isPreviewStudio(studio)) {
      return NextResponse.json({ success: false, message: 'Ative seu catálogo para poder editar.' }, { status: 403 });
    }

    const result = await saveBusinessProfile(studio.id, body);
    if (!result.ok) {
      return NextResponse.json({ success: false, field: result.field, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ success: true, profile: result.data });
  } catch (error) {
    console.error('[API Business] erro:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
