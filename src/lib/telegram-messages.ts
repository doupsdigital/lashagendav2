/** Textos dos avisos do Telegram para a dona do produto (F12.4). Arquivo puro
 *  (sem imports): `scripts/test-telegram-messages.mjs` roda direto no Node.
 *
 *  Regra: curtos e sem dado de saúde nenhum (nem do estúdio, nem de cliente).
 *  Só nome, plano, link e o que aconteceu. */

const DOMAIN = 'lashagenda.com';

/** Marca o que não é produção, para não confundir teste com venda de verdade.
 *  `vercelEnv`: VERCEL_ENV ('production' | 'preview' | 'development' | vazio no local). */
export function envTag(vercelEnv: string | undefined): string {
  return vercelEnv === 'production' ? '' : '🧪 [teste] ';
}

export function brDateTime(at: Date | string | number): string {
  return new Date(at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

function brDate(at: string | null): string {
  return at ? new Date(at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';
}

const studioLine = (name: string | null, slug: string) => `👤 ${name || 'Sem nome'}\n🔗 https://${slug}.${DOMAIN}`;

/** Nova prévia — resumido: nome e link, nada da lead além disso. */
export function previewCreatedMessage(input: { name: string; slug: string }): string {
  return `✨ Nova prévia: ${input.name}\n🔗 https://${input.slug}.${DOMAIN}`;
}

export function saleMessage(input: {
  plan: 'mensal' | 'anual';
  priceLabel: string;
  buyerName: string;
  slug: string;
  withoutPreview: boolean;
  emailNote: string;
  at: Date;
}): string {
  const lines = [
    `💳 Nova assinatura — ${input.plan === 'anual' ? 'Anual' : 'Mensal'} ${input.priceLabel}`,
    input.withoutPreview ? '⚠️ Sem prévia: catálogo criado pelo nome da compra, conferir.' : null,
    '',
    studioLine(input.buyerName, input.slug),
    `🕒 ${brDateTime(input.at)}`,
    input.emailNote ? `📧 ${input.emailNote}` : null,
  ];
  return lines.filter((l) => l !== null).join('\n');
}

export function canceledMessage(input: { name: string | null; slug: string; paidUntil: string | null }): string {
  return `🔕 Assinatura cancelada\n\n${studioLine(input.name, input.slug)}\n📅 Acesso até ${brDate(input.paidUntil)}`;
}

export function renewalRefusedMessage(input: { name: string | null; slug: string; paidUntil: string | null }): string {
  return `⏳ Renovação recusada (cartão)\n\n${studioLine(input.name, input.slug)}\n📅 Acesso até ${brDate(input.paidUntil)} + folga`;
}

export function revokedMessage(input: { kind: 'refund' | 'chargeback'; name: string | null; slug: string; at: Date }): string {
  return `⚠️ ${input.kind === 'refund' ? 'Reembolso' : 'Chargeback'} — acesso cortado\n\n${studioLine(input.name, input.slug)}\n🕒 ${brDateTime(input.at)}`;
}

/** Erro ao processar um aviso da Cakto: a Cakto não reenvia, então precisa de
 *  olho humano. `detail` vem da mensagem gravada em `cakto_events`. */
export function webhookErrorMessage(input: { event: string | null; detail: string; slug?: string | null; at: Date }): string {
  const detail = input.detail.length > 300 ? `${input.detail.slice(0, 300)}…` : input.detail;
  return [
    `🚨 Erro no aviso da Cakto (${input.event || 'sem evento'})`,
    '',
    detail,
    input.slug ? `🔗 https://${input.slug}.${DOMAIN}` : null,
    `🕒 ${brDateTime(input.at)}`,
    `👉 Conferir em https://${DOMAIN}/admin/cakto`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Aviso com segredo errado: alguém (ou a Cakto mal configurada) chamando o
 *  webhook. Mandado no máximo 1 vez por hora. */
export function webhookRejectedMessage(at: Date): string {
  return `🛑 Aviso da Cakto recusado (segredo errado)\n\nSe foi você mexendo na Cakto, confira o segredo do webhook. Se não, alguém está chamando o endereço.\n🕒 ${brDateTime(at)}\n👉 https://${DOMAIN}/admin/cakto`;
}
