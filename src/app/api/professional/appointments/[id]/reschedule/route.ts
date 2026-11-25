import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getInstantProblem } from '@/lib/scheduling/slot-lookup';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const OUTSIDE_MESSAGE = {
  outside_hours: 'Esse horário fica fora do seu expediente.',
  blocked: 'Esse horário está trancado na sua agenda.',
} as const;

/** POST /api/professional/appointments/[id]/reschedule  Body: { starts_at, allow_outside_hours? }
 *  Remarcar (F6.5): mesmo agendamento (mesmos serviços, mesma duração, mesmo
 *  link da cliente) em outro horário. Só aguardando/confirmado. Mesmas regras
 *  do manual: choque nunca passa; fora do expediente/trancado pede
 *  confirmação (`needsConfirmation`). O próprio agendamento não conta como choque. */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-appointment-reschedule:${ip}`, 30, 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde um instante.' }, { status: 429 });
    }

    const { id } = await params;
    const { starts_at, allow_outside_hours } = (await request.json()) as { starts_at?: string; allow_outside_hours?: boolean };
    const startsAt = new Date(starts_at || '');
    if (!starts_at || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ success: false, message: 'Escolha o novo dia e horário.' }, { status: 400 });
    }

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('id, status, origin, starts_at, ends_at, studio_id, studios(slug)')
      .eq('id', id)
      .maybeSingle();

    const studioSlug = (appointment?.studios as unknown as { slug: string } | null)?.slug;
    if (!appointment || !studioSlug || appointment.origin === 'record') {
      return NextResponse.json({ success: false, message: 'Agendamento não encontrado.' }, { status: 404 });
    }
    if (!(await isProfessionalRequestAuthorized(studioSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          message: appointment.status === 'canceled' ? 'Esse agendamento já foi cancelado.' : 'Só dá para remarcar um agendamento que ainda não aconteceu.',
        },
        { status: 409 }
      );
    }

    const durationMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000);
    if (startsAt.getTime() === new Date(appointment.starts_at).getTime()) {
      return NextResponse.json({ success: false, message: 'Esse já é o horário do agendamento.' }, { status: 400 });
    }

    const dateStr = startsAt.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const problem = await getInstantProblem(appointment.studio_id, startsAt, dateStr, durationMinutes, appointment.id);
    if (problem === 'conflict') {
      return NextResponse.json(
        { success: false, reason: 'conflict', message: 'Já existe um agendamento nesse horário. Escolha outro horário.' },
        { status: 409 }
      );
    }
    if (problem === 'invalid') {
      return NextResponse.json({ success: false, message: 'Duração do agendamento inválida.' }, { status: 400 });
    }
    if ((problem === 'outside_hours' || problem === 'blocked') && allow_outside_hours !== true) {
      return NextResponse.json({ success: false, needsConfirmation: true, reason: problem, message: OUTSIDE_MESSAGE[problem] }, { status: 409 });
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
    // Condicional ao status lido: se a cliente cancelou nesse meio tempo, nada muda.
    const { data: updated, error } = await supabaseAdmin
      .from('appointments')
      .update({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
      .eq('id', appointment.id)
      .eq('status', appointment.status)
      .select('id, starts_at, ends_at');

    if (error) {
      if (error.code === '23P01') {
        return NextResponse.json({ success: false, reason: 'conflict', message: 'Já existe um agendamento nesse horário.' }, { status: 409 });
      }
      console.error('[API Professional Reschedule] Erro:', error);
      return NextResponse.json({ success: false, message: 'Erro ao remarcar.' }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Esse agendamento mudou agora há pouco (a cliente pode ter cancelado). Atualize a tela.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, appointment: updated[0], outsideHours: problem !== null });
  } catch (error) {
    console.error('[API Professional Reschedule Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
