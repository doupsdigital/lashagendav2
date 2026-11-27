import 'server-only';
import { PRODUCTION_DOMAIN } from './public-url';
import { SUPPORT_WHATSAPP } from './support';
import { buildAccessEmailContent, buildPasswordResetEmailContent } from './access-email';

/** E-mails transacionais via Resend, por `fetch`, sem dependência nova.
 *  Nunca lança erro: um e-mail que falhou não pode derrubar o webhook da
 *  Cakto, que não reenvia evento.
 *
 *  Remetente (F11.4): `EMAIL_FROM` quando definido; senão, em produção
 *  (`VERCEL_ENV=production`) `acesso@lashagenda.com` — exige o domínio
 *  verificado no Resend (F13) — e fora dela o remetente de teste do Resend,
 *  que só entrega para o e-mail dono da conta Resend. */
function emailFrom(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  return process.env.VERCEL_ENV === 'production' ? 'LashAgenda <acesso@lashagenda.com>' : 'LashAgenda (teste) <onboarding@resend.dev>';
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY não configurada — e-mail ignorado.');
    return { ok: false, error: 'RESEND_API_KEY ausente' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: emailFrom(), to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Email] Resend recusou:', res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error) {
    console.error('[Email] Exceção ao enviar:', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Endereço do app nos links dos e-mails. Nunca vem do `Host` da requisição
 *  (alguém poderia forjar e receber o link de outra pessoa): `APP_ORIGIN`
 *  quando definido (teste na Vercel), `localhost` no `next dev`, senão o
 *  domínio oficial. */
export function appOrigin(): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return `https://${PRODUCTION_DOMAIN}`;
}

/** E-mail de acesso enviado na primeira aprovação da Cakto (conteúdo em
 *  `access-email.ts`). Os links usam `APP_ORIGIN` quando definido (ambiente
 *  de teste na Vercel); sem ele, o domínio oficial. */
export function buildAccessEmail(params: { name: string; slug: string; shortCode: string }) {
  return buildAccessEmailContent({
    ...params,
    origin: appOrigin(),
    productionDomain: PRODUCTION_DOMAIN,
    supportWhatsapp: SUPPORT_WHATSAPP,
  });
}

/** E-mail do "esqueci a senha" (F11.6). O link leva o `token_hash` do
 *  Supabase para `/entrar/nova-senha`, que confirma na tela (assim um leitor
 *  de e-mail que abre links sozinho não gasta o link). */
export function buildPasswordResetEmail(params: { name: string; tokenHash: string }) {
  const resetUrl = `${appOrigin()}/entrar/nova-senha?token_hash=${encodeURIComponent(params.tokenHash)}`;
  return buildPasswordResetEmailContent({ name: params.name, resetUrl, supportWhatsapp: SUPPORT_WHATSAPP });
}
