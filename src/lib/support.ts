/** Suporte do LashAgenda (fixo, não é por estúdio — diferente do WhatsApp da
 *  profissional, que é dela para as clientes dela). Um lugar só (F10.4):
 *  antes o número estava repetido em cada tela. */
export const SUPPORT_WHATSAPP = '5562991083435';

export function supportWhatsappUrl(text: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
