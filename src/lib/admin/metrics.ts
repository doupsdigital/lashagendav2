/** Números gerais do admin (F12.1). Arquivo puro (sem imports): o
 *  `scripts/test-admin-metrics.mjs` roda direto no Node. A busca no banco
 *  fica em `metrics-service.ts`, que já entrega `paid`/`lapsed` calculados
 *  pelas regras de `studio-access.ts`. */

export interface MetricsStudio {
  plan_status: 'preview' | 'active' | 'suspended' | 'canceled';
  cakto_plan: 'mensal' | 'anual' | null;
  manual_plan: boolean;
  created_at: string;
  /** Nasceu de uma prévia da página de venda (`acquisition_source = lp_preview`). */
  from_preview: boolean;
  /** Acesso pago em dia (`hasPaidAccess`). */
  paid: boolean;
  /** Já pagou e venceu (`isAccessLapsed`). */
  lapsed: boolean;
  /** Prévia ainda dentro das 24h. */
  preview_live: boolean;
}

export interface MetricsEvent {
  event: string | null;
  result: string;
  received_at: string;
}

export interface WindowNumbers {
  previews: number;
  approved: number;
  renewals: number;
  cancels: number;
  refunds: number;
}

export interface AdminMetrics {
  payingMensal: number;
  payingAnual: number;
  manual: number;
  lapsed: number;
  previewsLive: number;
  /** Receita mensal estimada: mensal × preço + anual × preço / 12. */
  mrr: number;
  d7: WindowNumbers;
  d30: WindowNumbers;
  /** false = `preview_log` ainda não existe: prévias contadas só entre as que
   *  sobraram no banco (as vencidas e não pagas já foram apagadas). */
  previewsExact: boolean;
  /** Compras aprovadas ÷ prévias, em 30 dias (null sem prévia). */
  conversion30: number | null;
  /** Últimos 14 dias, do mais antigo ao de hoje (fuso de São Paulo). */
  daily: { day: string; previews: number; approved: number }[];
}

const DAY_MS = 86400000;

export function spDay(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

const APPROVED = new Set(['purchase_approved']);
const RENEWED = new Set(['subscription_renewed']);
const CANCELED = new Set(['subscription_canceled', 'subscription_cancelled']);
const REFUNDED = new Set(['refund', 'chargeback']);

export function computeAdminMetrics(input: {
  studios: MetricsStudio[];
  events: MetricsEvent[];
  /** Instantes do `preview_log`; null se a tabela ainda não existe. */
  previewLog: string[] | null;
  nowMs: number;
  mensalPrice: number;
  anualPrice: number;
}): AdminMetrics {
  const { studios, events, previewLog, nowMs } = input;
  const paying = studios.filter((s) => s.paid && !s.manual_plan && s.plan_status !== 'preview');
  const payingMensal = paying.filter((s) => s.cakto_plan !== 'anual').length;
  const payingAnual = paying.filter((s) => s.cakto_plan === 'anual').length;

  const previewTimes = previewLog ?? studios.filter((s) => s.from_preview).map((s) => s.created_at);
  const processed = events.filter((e) => e.result === 'processed');

  const windowNumbers = (days: number): WindowNumbers => {
    const since = nowMs - days * DAY_MS;
    const inWin = (iso: string) => {
      const t = Date.parse(iso);
      return Number.isFinite(t) && t >= since && t <= nowMs;
    };
    const count = (set: Set<string>) => processed.filter((e) => e.event && set.has(e.event) && inWin(e.received_at)).length;
    return {
      previews: previewTimes.filter(inWin).length,
      approved: count(APPROVED),
      renewals: count(RENEWED),
      cancels: count(CANCELED),
      refunds: count(REFUNDED),
    };
  };
  const d7 = windowNumbers(7);
  const d30 = windowNumbers(30);

  const daily: AdminMetrics['daily'] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = spDay(nowMs - i * DAY_MS);
    daily.push({
      day,
      previews: previewTimes.filter((t) => spDay(t) === day).length,
      approved: processed.filter((e) => e.event && APPROVED.has(e.event) && spDay(e.received_at) === day).length,
    });
  }

  return {
    payingMensal,
    payingAnual,
    manual: studios.filter((s) => s.manual_plan).length,
    lapsed: studios.filter((s) => s.lapsed && !s.manual_plan && s.plan_status !== 'preview').length,
    previewsLive: studios.filter((s) => s.plan_status === 'preview' && s.preview_live).length,
    mrr: Math.round((payingMensal * input.mensalPrice + (payingAnual * input.anualPrice) / 12) * 100) / 100,
    d7,
    d30,
    previewsExact: previewLog !== null,
    conversion30: d30.previews > 0 ? d30.approved / d30.previews : null,
    daily,
  };
}
