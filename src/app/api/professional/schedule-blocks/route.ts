import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { localDateTimeToUTC } from '@/lib/scheduling/availability';
import { timeToMinutes } from '@/lib/scheduling/business-hours';
import { MAX_BLOCK_REASON, findBlockProblem } from '@/lib/scheduling/schedule-blocks';

/** Data ("YYYY-MM-DD") e minuto do dia de um instante, no fuso do estúdio. */
function localParts(iso: string): { date: string; minutes: number } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [h, m] = d
    .toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false })
    .split(':')
    .map(Number);
  return { date, minutes: (h % 24) * 60 + m };
}

/** POST /api/professional/schedule-blocks
 *  Cria uma folga/bloqueio (Config e Agenda). Dia inteiro vale para todo o
 *  período; com horário, a mesma faixa vale em cada dia do período.
 *  Devolve `affectedAppointments`: quantos agendamentos ativos caem dentro —
 *  o bloqueio não cancela ninguém, só avisa a profissional. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-schedule-block:${ip}`, 20, 5 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const { slug, start_date, end_date, all_day, start_time, end_time, reason } = body as {
      slug?: string;
      start_date?: string;
      end_date?: string;
      all_day?: boolean;
      start_time?: string;
      end_time?: string;
      reason?: string;
    };

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    }

    const allDay = Boolean(all_day);
    const problem = findBlockProblem({
      start_date: start_date || '',
      end_date: end_date || '',
      all_day: allDay,
      start_time,
      end_time,
    });
    if (problem) {
      return NextResponse.json({ success: false, message: problem }, { status: 400 });
    }
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, MAX_BLOCK_REASON) : '';

    const normalizedSlug = slug.toLowerCase().trim();
    if (!(await isProfessionalRequestAuthorized(normalizedSlug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { data: studio, error: studioErr } = await supabaseAdmin
      .from('studios')
      .select('id')
      .eq('slug', normalizedSlug)
      .single();

    if (studioErr || !studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    const startDate = start_date as string;
    const endDate = end_date as string;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('schedule_blocks')
      .insert({
        studio_id: studio.id,
        start_date: startDate,
        end_date: endDate,
        all_day: allDay,
        start_time: allDay ? null : start_time,
        end_time: allDay ? null : end_time,
        reason: cleanReason || null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[API Professional Schedule Blocks] Erro ao inserir:', insertErr);
      return NextResponse.json({ success: false, message: 'Erro ao criar o bloqueio.' }, { status: 500 });
    }

    // Agendamentos ativos que caem no bloqueio (só para avisar).
    let affectedAppointments = 0;
    const periodStart = localDateTimeToUTC(startDate, '00:00:00');
    const periodEnd = new Date(localDateTimeToUTC(endDate, '00:00:00').getTime() + 86_400_000);
    const { data: appts, error: apptsErr } = await supabaseAdmin
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('studio_id', studio.id)
      .in('status', ['pending', 'confirmed'])
      .neq('origin', 'record')
      .lt('starts_at', periodEnd.toISOString())
      .gt('ends_at', periodStart.toISOString());

    if (apptsErr) {
      console.error('[API Professional Schedule Blocks] Erro ao contar agendamentos:', apptsErr);
    } else if (allDay) {
      affectedAppointments = (appts || []).length;
    } else {
      const blockStart = timeToMinutes(start_time as string);
      const blockEnd = timeToMinutes(end_time as string);
      affectedAppointments = (appts || []).filter((a) => {
        const s = localParts(a.starts_at as string);
        const e = localParts(a.ends_at as string);
        const endMinutes = e.date === s.date ? e.minutes : 24 * 60;
        return s.date >= startDate && s.date <= endDate && s.minutes < blockEnd && endMinutes > blockStart;
      }).length;
    }

    return NextResponse.json({ success: true, block: inserted, affectedAppointments });
  } catch (error) {
    console.error('[API Professional Schedule Blocks Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
