import { NextResponse } from 'next/server';
import { PROFESSIONAL_SESSION_COOKIE, getProfessionalSessionSlug } from '@/lib/professional-session';
import { supabaseAdmin } from '@/lib/supabase-admin';

/** POST /api/professional/logout — apaga o cookie de sessão (`sm_pro_session`),
 *  seja ela originada do link mágico ou do login real (Fase 17).
 *
 *  Body opcional `{ endpoint }` (F12.3): a inscrição de notificação deste
 *  aparelho sai junto — quem saiu da conta não deve continuar recebendo os
 *  agendamentos do estúdio. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  if (endpoint) {
    const slug = await getProfessionalSessionSlug();
    if (slug) {
      const { data: studio } = await supabaseAdmin.from('studios').select('id').eq('slug', slug).maybeSingle();
      if (studio) await supabaseAdmin.from('push_subscriptions').delete().eq('studio_id', studio.id).eq('endpoint', endpoint);
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(PROFESSIONAL_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
