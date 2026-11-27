/** Links de checkout da Cakto do funil de autosserviço Lash.
 *  Arquivo SEM `server-only` de propósito — é lido pela página `/lash` e pelo
 *  card "Meu plano" no navegador. Os IDs dos produtos NÃO ficam aqui: vão na
 *  variável de ambiente `CAKTO_PRODUCT_MAP` (lida só pelo webhook,
 *  `src/lib/cakto.ts`).
 *
 *  F11.2: os links vêm de variáveis de ambiente públicas, para o ambiente de
 *  teste (produtos de teste da Cakto) e a produção (produtos reais, F13)
 *  usarem produtos diferentes sem mudar código:
 *    NEXT_PUBLIC_CAKTO_CHECKOUT_MENSAL — R$ 22,90/mês, assinatura no cartão
 *    NEXT_PUBLIC_CAKTO_CHECKOUT_ANUAL  — R$ 197/ano, Pix, pagamento único
 *  Sem a variável, o botão de assinar daquele plano não leva a lugar nenhum.
 *  (As referências são literais de propósito: o Next só embute no navegador
 *  `process.env.NEXT_PUBLIC_*` escrito por extenso.) */
function validUrl(v: string | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export const CAKTO_CHECKOUT_URLS: Record<'mensal' | 'anual', string | null> = {
  mensal: validUrl(process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_MENSAL),
  anual: validUrl(process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_ANUAL),
};
