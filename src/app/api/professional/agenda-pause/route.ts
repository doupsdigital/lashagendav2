import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized, PROFESSIONAL_SESSION_COOKIE } from '@/lib/professional-session';
import { hasPaidAccess } from '@/lib/studio-access';

/** PUT /api/professional/agenda-pause
 *  Body: { slug?, paused: boolean }
 *  Liga/desliga `studios.agenda_paused` — a profissional pausa o agendamento
 *  pelo catálogo temporariamente, sem mexer na assinatura. Ela continua com
 *  acesso total à própria Agenda; só o catálogo público (cliente final)
 *  passa a cair no WhatsApp. */
export async function PUT(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-agenda-pause:${ip}`, 20, 5 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = await request.json();
    let { slug, paused } = body as { slug?: string; paused?: boolean };

    if (!slug) {
      const cookieStore = await cookies();
      const cookieVal = cookieStore.get(PROFESSIONAL_SESSION_COOKIE)?.value;
      if (cookieVal) {
        slug = cookieVal.split('.')[0];
      }
    }

    if (!slug || typeof paused !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    if (!(await isProfessionalRequestAuthorized(normalizedSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('studios')
      .select('id, plan_status, paid_until, manual_plan')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    // Sem acesso pago em dia o agendamento já não funciona — pausar não teria
    // efeito e deixaria um estado "pausada" órfão para depois.
    if (!hasPaidAccess(order)) {
      return NextResponse.json({ success: false, message: 'O agendamento automático não está ativo pra esse catálogo.' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin.from('studios').update({ agenda_paused: paused }).eq('id', order.id);
    if (updateErr) {
      console.error('[API Agenda Pause] Erro ao atualizar:', updateErr);
      return NextResponse.json({ success: false, message: 'Erro ao salvar.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, agenda_paused: paused });
  } catch (error) {
    console.error('[API Agenda Pause Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
