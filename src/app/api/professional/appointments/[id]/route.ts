import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { cleanCancelReason, parseAmountReceived, transitionProblem, type AppointmentStatus } from '@/lib/scheduling/appointment-actions';

const ALLOWED_STATUSES = ['confirmed', 'canceled', 'completed', 'no_show'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PATCH /api/professional/appointments/[id]  Body: { status: 'confirmed' | 'canceled' | 'completed' | 'no_show', cancel_reason?, amount_received? }
 *  Só aceita as mudanças de `appointment-actions.ts` (F6.3); o motivo vai junto
 *  na recusa/cancelamento e aparece no link da cliente.
 *  A autorização nunca confia num `slug` vindo do navegador: resolve o
 *  estúdio a partir do próprio agendamento no banco e confere a sessão contra
 *  esse slug real — uma sessão de um estúdio não mexe no agendamento de outro. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-appointment-action:${ip}`, 30, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 });
    }

    const { id } = await params;
    const { status, cancel_reason, amount_received } = (await request.json()) as {
      status?: string;
      cancel_reason?: unknown;
      amount_received?: unknown;
    };

    if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
      return NextResponse.json({ success: false, message: 'Status inválido.' }, { status: 400 });
    }

    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('id, status, total_price, studios(slug)')
      .eq('id', id)
      .maybeSingle();

    const studioSlug = (appointment?.studios as unknown as { slug: string } | null)?.slug;
    if (apptErr || !appointment || !studioSlug) {
      return NextResponse.json({ success: false, message: 'Agendamento não encontrado.' }, { status: 404 });
    }

    if (!(await isProfessionalRequestAuthorized(studioSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // Cancelado não volta (o horário pode já ter sido ocupado); aguardando
    // precisa ser confirmado antes de concluir — regras em appointment-actions.
    const problem = transitionProblem(appointment.status as AppointmentStatus, status as AppointmentStatus);
    if (problem) {
      return NextResponse.json({ success: false, message: problem }, { status: 409 });
    }

    const update: Record<string, unknown> = { status };
    if (status === 'canceled') {
      update.canceled_at = new Date().toISOString();
      update.canceled_by = 'professional';
      update.cancel_reason = cleanCancelReason(cancel_reason);
    }
    // Concluir (F6.5): valor recebido; sem valor, fica o total dos serviços.
    // Saindo de concluído (desfazer / virou falta), o valor some.
    if (status === 'completed') {
      const amount = parseAmountReceived(amount_received);
      if (amount === undefined) {
        return NextResponse.json({ success: false, message: 'Valor recebido inválido.' }, { status: 400 });
      }
      update.amount_received = amount ?? appointment.total_price ?? null;
    } else {
      update.amount_received = null;
    }

    // Condicional ao status lido: se a cliente cancelou pelo link nesse meio
    // tempo, nada é sobrescrito.
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update(update)
      .eq('id', id)
      .eq('status', appointment.status)
      .select('id');
    if (updateErr) {
      if (updateErr.code === '23P01') {
        return NextResponse.json({ success: false, message: 'Já existe outro agendamento nesse horário.' }, { status: 409 });
      }
      console.error('[API Professional Appointment Update] Erro:', updateErr);
      return NextResponse.json({ success: false, message: 'Erro ao atualizar o agendamento.' }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Esse agendamento mudou agora há pouco (a cliente pode ter cancelado). Atualize a tela.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Professional Appointment Update Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
