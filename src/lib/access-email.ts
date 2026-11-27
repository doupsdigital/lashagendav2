/** E-mail de acesso do LashAgenda (F11.4) — montagem do conteúdo. Arquivo
 *  puro (sem imports): o `scripts/test-access-email.mjs` roda direto no Node.
 *  O envio fica em `email.ts`.
 *
 *  Vai na primeira ativação pela Cakto. É o caminho de reserva para quem pagou
 *  em outro aparelho (sem o cookie da prévia, a `/ativando` não loga sozinha).
 *  Cores da paleta aprovada (protótipo do Início, F1.4). */

export interface AccessEmailInput {
  name: string;
  slug: string;
  shortCode: string;
  /** Onde o app está no ar: `https://lashagenda.com` em produção, ou o
   *  endereço da Vercel no ambiente de teste. */
  origin: string;
  /** Domínio dos subdomínios do catálogo (`lashagenda.com`). Só vale quando
   *  `origin` é o domínio oficial; fora dele o catálogo é `<origin>/c/<slug>`. */
  productionDomain: string;
  supportWhatsapp: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const C = { bg: '#F7F3EE', card: '#FFFFFF', line: '#EADFD8', ink: '#2C1810', soft: '#7A6A62', faint: '#B0A097', r100: '#FAE8E8', r200: '#F5CECE', r600: '#A85560', r800: '#7A2E38' };

/** Os mesmos passos do checklist "Primeiros passos" do app (F11.5). */
export const ACCESS_EMAIL_STEPS = [
  'Confirme o WhatsApp onde suas clientes vão te chamar.',
  'Troque os serviços e preços de exemplo pelos seus.',
  'Coloque os dias e horários em que você atende.',
  'Crie seu acesso com Google ou senha, para entrar sem precisar deste e-mail.',
  'Compartilhe o link do seu catálogo na bio do Instagram.',
];

export function buildAccessEmailContent(p: AccessEmailInput) {
  const origin = p.origin.replace(/\/+$/, '');
  const official = origin === `https://${p.productionDomain}`;
  const firstName = p.name.trim().split(/\s+/)[0] || 'Lash';
  const appUrl = `${origin}/a/${encodeURIComponent(p.shortCode)}`;
  const catalogUrl = official ? `https://${p.slug}.${p.productionDomain}` : `${origin}/c/${p.slug}`;
  const catalogLabel = official ? `${p.slug}.${p.productionDomain}` : catalogUrl.replace(/^https?:\/\//, '');
  const whatsUrl = `https://wa.me/${p.supportWhatsapp}?text=${encodeURIComponent(`Oi! Comprei o LashAgenda (${p.slug}) e preciso de ajuda pra entrar.`)}`;
  const n = escapeHtml(firstName);

  const subject = `${firstName}, seu LashAgenda está ativo! Aqui está seu acesso`;

  const step = (num: number, text: string) => `
    <tr><td style="padding:6px 0;vertical-align:top;width:30px">
      <div style="width:22px;height:22px;border-radius:11px;background:${C.r100};color:${C.r600};font-size:12px;font-weight:700;line-height:22px;text-align:center">${num}</div>
    </td><td style="padding:6px 0;font-size:15px;color:${C.ink};line-height:1.5">${escapeHtml(text)}</td></tr>`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border-radius:20px;border:1px solid ${C.line};overflow:hidden">
  <tr><td style="background:linear-gradient(135deg,${C.r200},${C.r100});background-color:${C.r200};padding:28px 28px 24px;text-align:center">
    <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${C.r600};font-weight:700">LashAgenda</div>
    <div style="font-size:26px;line-height:1.25;color:${C.ink};font-weight:700;margin-top:8px">Pagamento confirmado, ${n}! 🎉</div>
    <div style="font-size:15px;color:${C.r800};margin-top:6px">Seu LashAgenda está ativo.</div>
  </td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 18px;font-size:15px;color:${C.ink};line-height:1.6">Toque no botão abaixo para entrar no seu app. É por lá que você cuida da sua agenda, das suas clientes e do seu catálogo.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${appUrl}" style="display:inline-block;background:${C.r600};color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:16px 32px;border-radius:14px">Entrar no meu app</a>
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;color:${C.soft};line-height:1.5;text-align:center">Se o botão não abrir, copie este link e cole no <b>Chrome</b> ou <b>Safari</b>:<br><a href="${appUrl}" style="color:${C.r600};word-break:break-all">${appUrl}</a></p>

    <div style="margin:26px 0 0;padding:16px;border-radius:14px;background:${C.bg};border:1px solid ${C.line}">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.soft};font-weight:700">O link do seu catálogo</div>
      <a href="${catalogUrl}" style="display:block;margin-top:4px;font-size:16px;color:${C.r600};font-weight:700;text-decoration:none">${escapeHtml(catalogLabel)}</a>
      <div style="font-size:13px;color:${C.soft};margin-top:4px">É por ele que suas clientes veem seus serviços e agendam sozinhas.</div>
    </div>

    <div style="margin:26px 0 8px;font-size:16px;font-weight:700;color:${C.ink}">Seus primeiros passos</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${ACCESS_EMAIL_STEPS.map((t, i) => step(i + 1, t)).join('')}
    </table>
    <p style="margin:18px 0 0;font-size:14px;color:${C.ink};line-height:1.6">O app te guia em cada passo. 💗</p>
  </td></tr>
  <tr><td style="padding:18px 28px 26px;border-top:1px solid ${C.line};font-size:13px;color:${C.soft};line-height:1.6;text-align:center">
    Guarde este e-mail: o botão acima sempre te leva para o seu app.<br>
    Ficou com dúvida? <a href="${whatsUrl}" style="color:${C.r600};font-weight:700">Fale com a gente no WhatsApp</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = `Pagamento confirmado, ${firstName}! Seu LashAgenda está ativo.

Entre no seu app (abra no Chrome ou Safari):
${appUrl}

O link do seu catálogo: ${catalogUrl}

Seus primeiros passos:
${ACCESS_EMAIL_STEPS.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Guarde este e-mail: o link acima sempre te leva para o seu app.
Dúvidas? Fale com a gente no WhatsApp: ${whatsUrl}`;

  return { subject, html, text };
}
