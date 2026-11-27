import { NextResponse } from 'next/server';
import { lapsedResponseForSlug } from '@/lib/access-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  createProfessionalSessionValue,
  isProfessionalRequestAuthorized,
  PROFESSIONAL_SESSION_COOKIE,
} from '@/lib/professional-session';
import { isPreviewStudio } from '@/lib/studio-access';
import { changeStudioSlug } from '@/lib/studio/slug-service';

/** POST /api/professional/slug (F10.3)
 *  Body: { slug (o atual), new_slug, confirm: true }
 *  Troca o endereço do link. A sessão é amarrada ao slug, então já devolve
 *  o cookie novo (ela continua logada no endereço novo). */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-slug:${ip}`, 10, 15 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const slug = typeof body?.slug === 'string' ? body.slug.toLowerCase().trim() : '';
    if (!body || !slug) return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    if (body.confirm !== true) {
      return NextResponse.json({ success: false, message: 'Confirme que entendeu o que muda.' }, { status: 400 });
    }

    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const lapsed = await lapsedResponseForSlug(slug);
    if (lapsed) return lapsed;

    const { data: studio } = await supabaseAdmin.from('studios').select('id, plan_status').eq('slug', slug).maybeSingle();
    if (!studio) return NextResponse.json({ success: false, message: 'Estúdio não encontrado.' }, { status: 404 });
    if (isPreviewStudio(studio)) {
      return NextResponse.json({ success: false, message: 'Ative seu catálogo para poder trocar o endereço.' }, { status: 403 });
    }

    const result = await changeStudioSlug(studio.id, slug, body.new_slug);
    if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: result.status });

    const response = NextResponse.json({ success: true, slug: result.slug });
    // Mesmas opções do login (`/api/professional/login`).
    response.cookies.set(PROFESSIONAL_SESSION_COOKIE, createProfessionalSessionValue(result.slug), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
    return response;
  } catch (error) {
    console.error('[API Slug] erro:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
