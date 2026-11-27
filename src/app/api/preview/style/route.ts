import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PREVIEW_SESSION_COOKIE, readPreviewSession } from '@/lib/preview-session';
import { isPreviewStudio } from '@/lib/studio-access';

/** POST /api/preview/style  { theme?: 'rose'|'luxury', layout?: 'mosaico'|'classico' }
 *
 *  Guarda o Tema/Modelo que ela escolheu na prévia (2026-11-18), pra o menu
 *  já nascer ativado do jeito que ela gostou. Só vale pra quem gerou a
 *  prévia (cookie `sm_preview`, amarrado ao `preview_code`) e só enquanto
 *  ainda é prévia — nunca mexe em estúdio pago. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const theme = body?.theme === 'rose' || body?.theme === 'luxury' ? body.theme : undefined;
  const layout = body?.layout === 'mosaico' || body?.layout === 'classico' ? body.layout : undefined;
  if (!theme && !layout) return NextResponse.json({ ok: false }, { status: 400 });

  const cookieStore = await cookies();
  const session = readPreviewSession(cookieStore.get(PREVIEW_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: order } = await supabaseAdmin
    .from('studios')
    .select('id, plan_status, preview_code')
    .eq('slug', session.slug)
    .maybeSingle();
  if (!order || order.preview_code !== session.previewCode || !isPreviewStudio(order)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('studios')
    .update({ ...(theme ? { theme_variant: theme } : {}), ...(layout ? { layout_model: layout } : {}) })
    .eq('id', order.id)
    .eq('plan_status', 'preview');
  if (error) {
    console.error('[Preview Style] Erro:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
