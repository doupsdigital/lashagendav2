/** Regras centrais de "o que este estúdio pode/está fazendo agora" (F2.2).
 *  Arquivo puro (sem `server-only`) — usado pelo servidor e por componentes.
 *  Fonte única: nenhuma tela ou rota decide isso sozinha a partir das colunas. */
import type { PlanStatus } from '@/types/studio';

/** Mesma folga do webhook da Cakto (`CAKTO_GRACE_MS` em `lib/cakto.ts`,
 *  arquivo server-only — por isso repetida aqui). Uma renovação que atrase
 *  uns dias não tira o estúdio do ar. */
export const ACCESS_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export interface StudioAccessFields {
  plan_status: PlanStatus;
  paid_until: string | null;
  manual_plan: boolean;
  disabled: boolean;
  agenda_paused?: boolean;
  preview_expires_at?: string | null;
}

/** Funcionalidades que um dia podem ser separadas por plano (Básico/Pro).
 *  No lançamento há um plano só, então tudo é liberado — a estrutura fica
 *  pronta para restringir depois sem caçar `if` pelo código. */
export type StudioFeature = 'booking' | 'clients' | 'client_records' | 'reports' | 'push';

export function studioHasFeature(_studio: unknown, _feature: StudioFeature): boolean {
  return true;
}

/** Prévia gratuita de 24h (página de venda), ainda não paga. */
export interface PreviewFields {
  plan_status?: PlanStatus | null;
  preview_expires_at?: string | null;
}

export function isPreviewStudio(studio: PreviewFields | null | undefined): boolean {
  return studio?.plan_status === 'preview';
}

export function isPreviewExpired(
  studio: PreviewFields | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!isPreviewStudio(studio)) return false;
  if (!studio?.preview_expires_at) return true;
  const t = new Date(studio.preview_expires_at).getTime();
  return !Number.isFinite(t) || t <= nowMs;
}

/** Já pagou alguma vez e o período pago (com folga) acabou. Decide pela
 *  data, não pelo status: cancelar mantém tudo no ar até `paid_until`, e um
 *  evento perdido do webhook não derruba ninguém. Liberação manual do admin
 *  nunca vence. Prévia não entra aqui (tem regra própria). */
export function isAccessLapsed(
  studio: Pick<StudioAccessFields, 'plan_status' | 'paid_until' | 'manual_plan'>,
  nowMs = Date.now()
): boolean {
  if (studio.manual_plan) return false;
  if (studio.plan_status === 'preview') return false;
  if (!studio.paid_until) return true;
  const t = new Date(studio.paid_until).getTime();
  return !Number.isFinite(t) || t + ACCESS_GRACE_MS < nowMs;
}

/** Pagante com acesso em dia (ou liberado à mão pelo admin). */
export function hasPaidAccess(studio: Pick<StudioAccessFields, 'plan_status' | 'paid_until' | 'manual_plan'>, nowMs = Date.now()): boolean {
  if (studio.manual_plan) return true;
  return studio.plan_status !== 'preview' && !isAccessLapsed(studio, nowMs);
}

/** O agendamento pelo catálogo está funcionando para a cliente final agora.
 *  Prévia não agenda (decisão provisória — a F11 revê a prévia). */
export function isBookingLive(studio: StudioAccessFields, nowMs = Date.now()): boolean {
  return (
    studioHasFeature(studio, 'booking') &&
    !studio.disabled &&
    !studio.agenda_paused &&
    hasPaidAccess(studio, nowMs)
  );
}
