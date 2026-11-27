import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { passwordProblem } from '@/lib/auth/access-rules';
import { createProfessionalSessionValue, PROFESSIONAL_SESSION_COOKIE } from '@/lib/professional-session';

/** POST /api/auth/password-update { token_hash, password } — fim do
 *  "Esqueci a senha" (F11.6). Confere o link de recuperação no Supabase Auth
 *  (só funciona uma vez, vale 1 hora), grava a nova senha e já abre o app
 *  (mesmo cookie do login). O link só é gasto aqui, quando ela envia a senha
 *  nova — abrir a página não gasta. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`password-update:${ip}`, 10, 15 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
    }
    const body = await request.json().catch(() => null);
    const tokenHash = typeof body?.token_hash === 'string' ? body.token_hash.trim() : '';
    if (!tokenHash || tokenHash.length > 200) {
      return NextResponse.json({ success: false, code: 'link', message: 'Esse link não é válido. Peça um novo em "Esqueci a senha".' }, { status: 400 });
    }
    const problem = passwordProblem(body?.password);
    if (problem) return NextResponse.json({ success: false, field: 'password', message: problem }, { status: 400 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    const user = data?.user;
    if (error || !user) {
      return NextResponse.json(
        { success: false, code: 'link', message: 'Esse link já foi usado ou venceu. Peça um novo em "Esqueci a senha".' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: body.password });
    if (updateError) {
      console.error('[Password Update] updateUserById:', updateError.message);
      return NextResponse.json({ success: false, message: 'Não foi possível salvar a senha. Peça um novo link.' }, { status: 500 });
    }

    const { data: studio } = await supabaseAdmin.from('studios').select('slug').eq('auth_user_id', user.id).maybeSingle();
    if (!studio) {
      return NextResponse.json({ success: true, slug: null, message: 'Senha nova salva. Entre com ela na tela de entrar.' });
    }
    const response = NextResponse.json({ success: true, slug: studio.slug });
    response.cookies.set(PROFESSIONAL_SESSION_COOKIE, createProfessionalSessionValue(studio.slug), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
    return response;
  } catch (error) {
    console.error('[Password Update Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno. Tente de novo.' }, { status: 500 });
  }
}
