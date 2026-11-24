/** Links de checkout da Cakto do funil de autosserviço Lash (2026-11-17).
 *  Arquivo SEM `server-only` de propósito — é lido pela página `/lash` no
 *  navegador. Os IDs dos produtos NÃO ficam aqui: vão na variável de
 *  ambiente `CAKTO_PRODUCT_MAP` (lida só pelo webhook, `src/lib/cakto.ts`).
 *
 *  Mensal: R$ 22,90/mês, assinatura, só cartão de crédito.
 *  Anual:  R$ 127, pagamento único no Pix, acesso de 1 ano. */
/** Desligado na F1.4 (2026-11-24): os links que vieram do StudioMenu eram dos
 *  produtos REAIS dele na Cakto. Os produtos do LashAgenda (mensal R$ 22,90 e
 *  anual R$ 197) entram na F11; até lá, o botão de assinar não leva a lugar nenhum. */
export const CAKTO_CHECKOUT_URLS: Record<'mensal' | 'anual', string | null> = {
  mensal: null,
  anual: null,
};
