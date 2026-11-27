import 'server-only';
import { PRODUCTION_DOMAIN } from './public-url';
import { SUPPORT_WHATSAPP } from './support';
import { buildAccessEmailContent } from './access-email';

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

/** E-mail de acesso enviado na primeira aprovação da Cakto (conteúdo em
 *  `access-email.ts`). Os links usam `APP_ORIGIN` quando definido (ambiente
 *  de teste na Vercel); sem ele, o domínio oficial. */
export function buildAccessEmail(params: { name: string; slug: string; shortCode: string }) {
  return buildAccessEmailContent({
    ...params,
    origin: process.env.APP_ORIGIN || `https://${PRODUCTION_DOMAIN}`,
    productionDomain: PRODUCTION_DOMAIN,
    supportWhatsapp: SUPPORT_WHATSAPP,
  });
}
