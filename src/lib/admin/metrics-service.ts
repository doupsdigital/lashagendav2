import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { hasPaidAccess, isAccessLapsed, isPreviewExpired } from '../studio-access';
import { CAKTO_ANUAL_PRICE, CAKTO_MENSAL_PRICE } from '../pricing';
import { computeAdminMetrics, type AdminMetrics, type MetricsStudio } from './metrics';

const DAY_MS = 86400000;

/** Busca o que os números do admin precisam (F12.1) e calcula. */
export async function getAdminMetrics(nowMs = Date.now()): Promise<AdminMetrics> {
  const since = new Date(nowMs - 31 * DAY_MS).toISOString();
  const [studiosRes, eventsRes, logRes] = await Promise.all([
    supabaseAdmin
      .from('studios')
      .select('plan_status, cakto_plan, paid_until, manual_plan, created_at, acquisition_source, preview_expires_at'),
    supabaseAdmin.from('cakto_events').select('event, result, received_at').gte('received_at', since).limit(5000),
    supabaseAdmin.from('preview_log').select('created_at').gte('created_at', since).limit(20000),
  ]);
  if (studiosRes.error) throw studiosRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (logRes.error) console.warn('[Admin Metrics] preview_log indisponível:', logRes.error.message);

  const studios: MetricsStudio[] = (studiosRes.data || []).map((s) => ({
    plan_status: s.plan_status,
    cakto_plan: s.cakto_plan,
    manual_plan: s.manual_plan,
    created_at: s.created_at,
    from_preview: s.acquisition_source === 'lp_preview',
    paid: hasPaidAccess(s, nowMs),
    lapsed: isAccessLapsed(s, nowMs),
    preview_live: s.plan_status === 'preview' && !isPreviewExpired(s, nowMs),
  }));

  return computeAdminMetrics({
    studios,
    events: eventsRes.data || [],
    previewLog: logRes.error ? null : (logRes.data || []).map((r) => r.created_at as string),
    nowMs,
    mensalPrice: CAKTO_MENSAL_PRICE,
    anualPrice: CAKTO_ANUAL_PRICE,
  });
}
