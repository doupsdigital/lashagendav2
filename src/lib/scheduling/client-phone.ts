/** WhatsApp da cliente (F5.2): a mesma pessoa tem de cair na mesma cliente,
 *  não importa como digitou o número. Arquivo puro (sem imports) — o
 *  `scripts/test-client-phone.mjs` roda direto no Node.
 *
 *  Forma guardada no banco (`clients.whatsapp`, e `whatsapp_digits` gerado):
 *  só dígitos, DDD + número, SEM o 55 do país, com o 9 dos celulares.
 *  Ex.: "+55 (62) 9 9999-0000", "062 99999-0000", "62 9999-0000" → "62999990000".
 *  Para links `wa.me` use `normalizeWhatsappBR` (`lib/format.ts`), que põe o 55. */

/** DDDs válidos no Brasil: dois dígitos de 1 a 9 (não existe 0 no DDD). */
const DDD_RE = /^[1-9][1-9]$/;

/** Celular antigo sem o 9 (10 dígitos, número começando por 6, 7, 8 ou 9)
 *  ganha o 9 — fixo (começa por 2 a 5) fica com 10 dígitos. */
export function normalizeClientWhatsapp(raw: string | null | undefined): string {
  let digits = (raw || '').replace(/\D/g, '');
  // 55 do país na frente (12 ou 13 dígitos).
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  // Zero de discagem antes do DDD ("062…").
  digits = digits.replace(/^0+/, '');
  if (digits.length === 10 && /[6-9]/.test(digits[2])) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  return digits;
}

/** O número normalizado é um telefone brasileiro possível: DDD válido +
 *  celular (11 dígitos, começando por 9) ou fixo (10 dígitos, começando por 2 a 5). */
export function isValidClientWhatsapp(normalized: string): boolean {
  if (!DDD_RE.test(normalized.slice(0, 2))) return false;
  if (normalized.length === 11) return normalized[2] === '9';
  if (normalized.length === 10) return /[2-5]/.test(normalized[2]);
  return false;
}

/** Outras formas do mesmo celular que podem já estar no banco (cadastros
 *  antigos/importados sem o 9). Usado só para ACHAR a cliente. */
export function legacyWhatsappVariants(normalized: string): string[] {
  if (normalized.length === 11 && normalized[2] === '9' && /[6-9]/.test(normalized[3])) {
    return [`${normalized.slice(0, 2)}${normalized.slice(3)}`];
  }
  return [];
}

export const INVALID_WHATSAPP_MESSAGE = 'WhatsApp inválido — confira o DDD e o número.';
