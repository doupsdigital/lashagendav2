import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CAKTO_GRACE_MS } from '@/lib/cakto';

/** GET /api/cron/cleanup-previews
 *  Chamada 1x/dia por um Vercel Cron Job (`vercel.json`), mesma proteção por
 *  `CRON_SECRET` de `cleanup-rate-limits`.
 *
 *  1. Apaga as prévias gratuitas vencidas e nunca pagas (serviços saem
 *     junto, em cascata) — libera o nome/subdomínio. O catálogo público já
 *     mostra "prévia expirada" sozinho quando vence; isso aqui é só faxina.
 *  2. Marca como `suspended` os estúdios `active` com `paid_until` vencido
 *     (fora da folga) — só para o status ficar coerente no admin/app; quem
 *     tira o catálogo do ar é `paid_until`. Liberação manual nunca vence. */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const now = new Date();

    const { error: deleteError, count: deleted } = await supabaseAdmin
      .from('studios')
      .delete({ count: 'exact' })
      .eq('plan_status', 'preview')
      .eq('manual_plan', false)
      .lt('preview_expires_at', now.toISOString());

    if (deleteError) {
      console.error('[Cron Cleanup Previews] Erro ao apagar prévias:', deleteError);
      return NextResponse.json({ success: false, message: 'Erro ao apagar prévias.' }, { status: 500 });
    }

    const lapsedCutoff = new Date(now.getTime() - CAKTO_GRACE_MS).toISOString();
    const { error: suspendError, count: suspended } = await supabaseAdmin
      .from('studios')
      .update({ plan_status: 'suspended' }, { count: 'exact' })
      .eq('plan_status', 'active')
      .eq('manual_plan', false)
      .lt('paid_until', lapsedCutoff);

    if (suspendError) {
      console.error('[Cron Cleanup Previews] Erro ao suspender vencidos:', suspendError);
      return NextResponse.json({ success: false, message: 'Erro ao suspender vencidos.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedPreviews: deleted, suspended });
  } catch (error) {
    console.error('[Cron Cleanup Previews Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
