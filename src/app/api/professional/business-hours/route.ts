import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { findRangeProblem, type TimeRange } from '@/lib/scheduling/business-hours';

interface HoursInput extends TimeRange {
  weekday: number;
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** PUT /api/professional/business-hours
 *  Substitui a grade semanal inteira (apaga e grava de novo) — nada
 *  referencia o id de `business_hours`. Cada dia pode ter várias faixas
 *  (F4.1); faixas do mesmo dia não podem se sobrepor (o banco também trava). */
export async function PUT(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`professional-business-hours:${ip}`, 20, 5 * 60);
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const { slug, hours } = body as { slug?: string; hours?: HoursInput[] };

    if (!slug || !Array.isArray(hours)) {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 });
    }

    const byWeekday = new Map<number, TimeRange[]>();
    for (const h of hours) {
      if (typeof h?.weekday !== 'number' || !Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6) {
        return NextResponse.json({ success: false, message: 'Dia da semana inválido.' }, { status: 400 });
      }
      const list = byWeekday.get(h.weekday) || [];
      list.push({ start_time: h.start_time, end_time: h.end_time });
      byWeekday.set(h.weekday, list);
    }
    for (const [weekday, ranges] of byWeekday) {
      const problem = findRangeProblem(ranges);
      if (problem) {
        return NextResponse.json({ success: false, message: `${WEEKDAY_LABELS[weekday]}: ${problem}` }, { status: 400 });
      }
    }

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

    // Guarda a grade atual para devolver se a gravação da nova falhar — sem
    // isso, um erro no meio deixaria o estúdio sem horário nenhum.
    const { data: previous } = await supabaseAdmin
      .from('business_hours')
      .select('weekday, start_time, end_time')
      .eq('studio_id', studio.id);

    const { error: deleteErr } = await supabaseAdmin.from('business_hours').delete().eq('studio_id', studio.id);
    if (deleteErr) {
      console.error('[API Business Hours] Erro ao limpar grade anterior:', deleteErr);
      return NextResponse.json({ success: false, message: 'Erro ao salvar os horários.' }, { status: 500 });
    }

    if (hours.length > 0) {
      const { error: insertErr } = await supabaseAdmin.from('business_hours').insert(
        hours.map((h) => ({ studio_id: studio.id, weekday: h.weekday, start_time: h.start_time, end_time: h.end_time }))
      );
      if (insertErr) {
        console.error('[API Business Hours] Erro ao inserir grade nova:', insertErr);
        if (previous && previous.length > 0) {
          const { error: restoreErr } = await supabaseAdmin
            .from('business_hours')
            .insert(previous.map((h) => ({ ...h, studio_id: studio.id })));
          if (restoreErr) console.error('[API Business Hours] Erro ao restaurar grade anterior:', restoreErr);
        }
        const message =
          insertErr.code === '23P01' ? 'Duas faixas do mesmo dia estão se sobrepondo.' : 'Erro ao salvar os horários.';
        return NextResponse.json({ success: false, message }, { status: insertErr.code === '23P01' ? 400 : 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Business Hours Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
