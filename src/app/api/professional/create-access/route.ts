import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { cleanAccessEmail, passwordProblem } from '@/lib/auth/access-rules';

/** POST /api/professional/create-access { slug, email, password }
 *
 *  Cria o acesso com e-mail e senha e vincula ao estúdio (F11.6). Sem e-mail
 *  de confirmação (decisão da dona, 2026-11-27): só chama quem já está dentro
 *  do app daquele estúdio (cookie `sm_pro_session`), e só enquanto o estúdio
 *  não tem login vinculado.
 *
 *  E-mail que já tem conta: só vincula se a senha digitada for a dessa conta
 *  (conferida no Supabase Auth) — sem isso, qualquer um vincularia a conta de
 *  outra pessoa ao próprio estúdio. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-create-access:${ip}`, 10, 15 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === 'string' ? body.slug.toLowerCase().trim() : '';
    if (!slug || !(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão expirada. Abra o app de novo.' }, { status: 401 });
    }
    const email = cleanAccessEmail(body?.email);
    if (!email) return NextResponse.json({ success: false, field: 'email', message: 'Esse e-mail não parece certo. Confira.' }, { status: 400 });
    const problem = passwordProblem(body?.password);
    if (problem) return NextResponse.json({ success: false, field: 'password', message: problem }, { status: 400 });
    const password = body.password as string;

    const { data: studio } = await supabaseAdmin.from('studios').select('id, auth_user_id').eq('slug', slug).maybeSingle();
    if (!studio) return NextResponse.json({ success: false, message: 'Estúdio não encontrado.' }, { status: 404 });
    if (studio.auth_user_id) {
      return NextResponse.json({ success: false, message: 'Este LashAgenda já tem um acesso criado.' }, { status: 409 });
    }

    let userId: string;
    let createdNow = false;
    const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.data?.user) {
      userId = created.data.user.id;
      createdNow = true;
    } else {
      const exists = created.error?.code === 'email_exists' || /already (been )?registered/i.test(created.error?.message || '');
      if (!exists) {
        console.error('[Create Access] createUser:', created.error?.message);
        return NextResponse.json({ success: false, message: 'Não foi possível criar o acesso. Tente de novo.' }, { status: 500 });
      }
      if (!(await checkRateLimit(`professional-create-access-pw:${email}`, 5, 15 * 60))) {
        return NextResponse.json({ success: false, message: 'Muitas tentativas com esse e-mail. Aguarde alguns minutos.' }, { status: 429 });
      }
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signIn = await anon.auth.signInWithPassword({ email, password });
      if (signIn.error || !signIn.data.user) {
        return NextResponse.json(
          { success: false, field: 'password', message: 'Já existe um acesso com esse e-mail e a senha não confere. Use a senha dele, ou "Esqueci a senha" na tela de entrar.' },
          { status: 409 }
        );
      }
      userId = signIn.data.user.id;
    }

    // `.is(null)`: se duas abas criarem ao mesmo tempo, só uma vincula.
    const { data: linked, error: linkError } = await supabaseAdmin
      .from('studios')
      .update({ auth_user_id: userId })
      .eq('id', studio.id)
      .is('auth_user_id', null)
      .select('id');
    if (linkError || !linked?.length) {
      if (createdNow) await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      if (linkError?.code === '23505') {
        return NextResponse.json({ success: false, field: 'email', message: 'Esse e-mail já é o acesso de outro LashAgenda.' }, { status: 409 });
      }
      if (!linkError) return NextResponse.json({ success: false, message: 'Este LashAgenda já tem um acesso criado.' }, { status: 409 });
      console.error('[Create Access] vínculo:', linkError.message);
      return NextResponse.json({ success: false, message: 'Não foi possível criar o acesso. Tente de novo.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('[Create Access Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno. Tente de novo.' }, { status: 500 });
  }
}
