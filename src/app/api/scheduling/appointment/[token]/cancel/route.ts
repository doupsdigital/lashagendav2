import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendPushToStudio } from '@/lib/push-notifications';
import { getClientAppointment } from '@/lib/scheduling/client-appointment-service';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/** POST /api/scheduling/appointment/[token]/cancel  Body: { slug }
 *  A cliente cancela pelo link único (F5.4). Sem login: quem tem o token é a
 *  dona do agendamento. Respeita o prazo do estúdio
 *  (`cancellation_notice_hours`); depois dele, só pelo WhatsApp. */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`client-appointment-cancel:${ip}`, 10, 10 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const { token } = await params;
    const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
    const view = slug ? await getClientAppointment(slug, token) : null;
    if (!view) {
      return NextResponse.json({ success: false, message: 'Agendamento não encontrado.' }, { status: 404 });
    }

    if (!view.cancel.canCancel) {
      const message =
        view.cancel.reason === 'already_canceled'
          ? 'Esse agendamento já está cancelado.'
          : view.cancel.reason === 'too_late'
            ? `O prazo para cancelar por aqui já passou (até ${view.cancellationNoticeHours}h antes). Fale com a profissional pelo WhatsApp.`
            : 'Esse agendamento não pode mais ser cancelado.';
      return NextResponse.json({ success: false, message }, { status: 409 });
    }

    // Só muda se ainda estiver ativo (evita corrida com a profissional
    // cancelando/concluindo ao mesmo tempo).
    const { data: updated, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'canceled', canceled_at: new Date().toISOString(), canceled_by: 'client' })
      .eq('id', view.id)
      .in('status', ['pending', 'confirmed'])
      .select('id');

    if (error) {
      console.error('[API Client Cancel] Erro:', error);
      return NextResponse.json({ success: false, message: 'Erro ao cancelar. Tente de novo.' }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, message: 'Esse agendamento não pode mais ser cancelado.' }, { status: 409 });
    }

    const startsAt = new Date(view.startsAt);
    const when = `${startsAt
      .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' })
      .replace('.', '')}, ${startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })} às ${startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
    await sendPushToStudio(view.studio.id, {
      title: '❌ Agendamento cancelado pela cliente',
      body: `${view.clientFirstName || 'Cliente'} · ${view.items.map((i) => i.title).join(' + ')} · ${when}`,
      url: `/app/${view.studio.slug}/agenda`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Client Cancel Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
