import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { cleanAccessEmail } from '@/lib/auth/access-rules';
import { buildPasswordResetEmail, sendEmail } from '@/lib/email';

const SENT = {
  success: true,
  message: 'Se esse e-mail for o acesso de um LashAgenda, você vai receber o link para criar uma nova senha em alguns minutos. Confira também o spam.',
};

/** POST /api/auth/password-reset { email } — "Esqueci a senha" (F11.6).
 *
 *  Responde sempre a mesma coisa, exista ou não a conta (não revela quais
 *  e-mails têm acesso). Só manda o e-mail quando a conta está vinculada a um
 *  estúdio. O link é gerado pelo Supabase Auth (`generateLink`, recuperação,
 *  vale 1 hora) e vai pelo Resend, em português. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`password-reset:${ip}`, 5, 15 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 });
    }
    const body = await request.json().catch(() => null);
    const email = cleanAccessEmail(body?.email);
    if (!email) return NextResponse.json({ success: false, message: 'Esse e-mail não parece certo. Confira.' }, { status: 400 });
    // Por e-mail também: ninguém enche a caixa de outra pessoa trocando de IP.
    if (!(await checkRateLimit(`password-reset-email:${email}`, 3, 60 * 60))) return NextResponse.json(SENT);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email });
    const user = data?.user;
    const tokenHash = data?.properties?.hashed_token;
    if (error || !user || !tokenHash) return NextResponse.json(SENT);

    const { data: studio } = await supabaseAdmin
      .from('studios')
      .select('owner_name, slug')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (!studio) return NextResponse.json(SENT);

    const content = buildPasswordResetEmail({ name: studio.owner_name || '', tokenHash });
    const sent = await sendEmail({ to: email, ...content });
    if (!sent.ok) console.error('[Password Reset] e-mail não saiu:', sent.error);
    return NextResponse.json(SENT);
  } catch (error) {
    console.error('[Password Reset Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno. Tente de novo.' }, { status: 500 });
  }
}
