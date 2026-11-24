import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequestAuthorized } from '@/lib/admin-session';
import { computePaidUntil, type CaktoPlan } from '@/lib/cakto';
import { assignAppShortCode } from '@/lib/short-link';

/** GET /api/admin/cakto?slug=opcional
 *  Últimos webhooks recebidos da Cakto (tabela `cakto_events`), pra conferir
 *  à mão o que chegou e o que aconteceu com cada um (2026-11-18). */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 403 });
  }
  const slug = new URL(request.url).searchParams.get('slug');
  let query = supabaseAdmin
    .from('cakto_events')
    .select('id, received_at, event, cakto_order_id, slug, result, message, payload')
    .order('received_at', { ascending: false })
    .limit(150);
  if (slug) query = query.eq('slug', slug);
  const { data, error } = await query;
  if (error) {
    console.error('[Admin Cakto Events] Erro:', error);
    return NextResponse.json({ success: false, message: 'Erro ao buscar eventos.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, events: data || [] });
}

/** POST /api/admin/cakto  { id, plan: 'mensal' | 'anual' }
 *  Ativa (ou estende) à mão um estúdio como cliente da Cakto — pro caso
 *  raro de uma compra que não caiu no estúdio certo (sem `sck`, webhook
 *  perdido). Mesmo efeito de uma aprovação do webhook: +1 mês ou +1 ano a
 *  partir de hoje ou do `paid_until` atual, o que for maior. */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    const plan = body?.plan as CaktoPlan;
    if (!id || (plan !== 'mensal' && plan !== 'anual')) {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('studios')
      .select('id, slug, paid_until, app_short_code')
      .eq('id', id)
      .maybeSingle();
    if (error || !order) return NextResponse.json({ success: false, message: 'Estúdio não encontrado.' }, { status: 404 });

    const paidUntil = computePaidUntil(plan, order.paid_until);
    const { error: updateError } = await supabaseAdmin
      .from('studios')
      .update({
        plan_status: 'active',
        preview_expires_at: null,
        paid_until: paidUntil,
        cakto_plan: plan,
      })
      .eq('id', order.id);
    if (updateError) throw updateError;
    if (!order.app_short_code) await assignAppShortCode(order.id);

    await supabaseAdmin.from('cakto_events').insert({
      event: 'admin_manual_activation',
      slug: order.slug,
      result: 'processed',
      message: `ativado/estendido à mão pelo admin: ${plan} até ${paidUntil}`,
      payload: { plan, paid_until: paidUntil },
    });

    return NextResponse.json({ success: true, paidUntil });
  } catch (error) {
    console.error('[Admin Cakto Activate] Erro:', error);
    return NextResponse.json({ success: false, message: 'Erro ao ativar.' }, { status: 500 });
  }
}
