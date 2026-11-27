/** Formatação de preço e duração dos serviços (números do banco v2 → texto
 *  das telas). Arquivo puro, sem `server-only` — o catálogo usa no navegador. */
import { formatMinutesToLabel, parseDurationToMinutes } from './format';
import type { ProcedureItem, ProcedureVariation } from '@/types/catalog';

export const PRICE_ON_REQUEST_LABEL = 'Sob Consulta';

/** Duração usada quando um texto antigo não tem número nenhum. O banco
 *  exige duração em todo serviço; a F3 torna o campo obrigatório no editor. */
export const FALLBACK_DURATION_MINUTES = 60;

export function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 150 → "R$ 150" · 150.5 → "R$ 150,50" · 1234 → "R$ 1.234". */
export function formatBRL(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0;
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Número do banco → texto exibido no catálogo. */
export function priceToLabel(price: number | string | null | undefined, priceFrom = false): string {
  const n = toNumberOrNull(price);
  if (n === null) return PRICE_ON_REQUEST_LABEL;
  return priceFrom ? `A partir de ${formatBRL(n)}` : formatBRL(n);
}

/** Texto livre do editor antigo ("R$ 1.234,56", "150", "A partir de R$ 90",
 *  "Sob consulta") → colunas `price`/`price_from`. Sem número = sob consulta. */
export function parsePriceLabel(label: string | null | undefined): { price: number | null; price_from: boolean } {
  const text = (label || '').trim();
  const price_from = /a\s+partir/i.test(text);
  const match = text.match(/\d[\d.,]*/);
  if (!match) return { price: null, price_from: false };

  let raw = match[0];
  if (raw.includes(',')) {
    // Formato brasileiro: ponto = milhar, vírgula = decimal.
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}(\.|$)/.test(raw)) {
    // "1.234" sem vírgula = milhar.
    raw = raw.replace(/\./g, '');
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { price: null, price_from: false };
  return { price: Math.round(n * 100) / 100, price_from };
}

/** Texto do preço de um serviço do catálogo. */
export function procedurePriceLabel(item: { price: number | null; price_from?: boolean }): string {
  return priceToLabel(item.price, Boolean(item.price_from));
}

/** O serviço "virado" na variação escolhida, para o agendamento e as telas
 *  seguintes: título "Serviço — Variação", duração e preço da variação. O
 *  `id` continua o do serviço; a variação vai em `variation_id`. */
export function procedureWithVariation(item: ProcedureItem, variation: ProcedureVariation): ProcedureItem {
  return {
    ...item,
    title: `${item.title} — ${variation.name}`,
    price: variation.price,
    price_from: false,
    duration_minutes: variation.duration_minutes,
    variations: undefined,
    variation_id: variation.id,
  };
}

/** Minutos do banco → texto curto ("1h30min"). */
export function durationToLabel(minutes: number | null | undefined): string {
  return minutes ? formatMinutesToLabel(minutes) : '';
}

/** Duração para gravar: o número explícito, senão o texto, senão o padrão.
 *  Sempre dentro da faixa aceita pelo banco (5 a 720 minutos). */
export function resolveDurationMinutes(minutes: number | null | undefined, label?: string | null): number {
  const candidate =
    typeof minutes === 'number' && minutes > 0 ? minutes : parseDurationToMinutes(label) ?? FALLBACK_DURATION_MINUTES;
  return Math.min(720, Math.max(5, Math.round(candidate)));
}

/** Preço total de um agendamento com vários serviços: soma do que tem preço;
 *  "A partir de" se algum item é "a partir de"; "+ sob consulta" se algum
 *  item não tem preço; só "Sob Consulta" se nenhum tem. */
export function bookingTotalLabel(items: { price: number | null; price_from?: boolean }[]): string {
  const priced = items.filter((i) => typeof i.price === 'number');
  if (priced.length === 0) return PRICE_ON_REQUEST_LABEL;
  const sum = Math.round(priced.reduce((acc, i) => acc + (i.price as number), 0) * 100) / 100;
  const from = priced.some((i) => i.price_from);
  const onRequest = priced.length < items.length;
  return `${from ? 'A partir de ' : ''}${formatBRL(sum)}${onRequest ? ' + sob consulta' : ''}`;
}
