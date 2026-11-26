/** Preços exibidos do plano único (vendido pela Cakto). Os valores cobrados
 *  de verdade ficam nos produtos da Cakto; estes são só o que as telas
 *  mostram. Mudar aqui SEM mudar na Cakto deixa a página com um preço
 *  diferente do checkout.
 *
 *  F11.2: anual atualizado para o valor do LashAgenda v2, R$ 197/ano
 *  (DECISOES_DE_PRODUTO.md, seção 4) — antes estava o do StudioMenu (R$ 127). */
export const CAKTO_MENSAL_PRICE = 22.9;
export const CAKTO_ANUAL_PRICE = 197.0;

/** "R$ 22,90" / "R$ 197" — para textos (Telegram, e-mail). */
export function priceLabel(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
