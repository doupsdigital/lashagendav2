import { NextResponse } from 'next/server';
import { lapsedResponseForSlug } from '@/lib/access-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { normalizeWhatsappBR } from '@/lib/format';
import { MARKABLE_STEPS, parseOnboardingSteps, type SelfServeStepId } from '@/lib/self-serve-onboarding';

/** POST /api/professional/onboarding
 *    { slug, action: 'whatsapp', whatsapp }  → salva o WhatsApp do estúdio e marca o passo
 *    { slug, action: 'mark', step }          → marca um passo como feito
 *
 *  Checklist "Primeiros passos" pós-compra. Só com a
 *  sessão da profissional daquele catálogo. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === 'string' ? body.slug.toLowerCase().trim() : '';
    const action = body?.action;
    if (!slug || !(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão expirada. Abra o app de novo.' }, { status: 401 });
    }
    const lapsed = await lapsedResponseForSlug(slug);
    if (lapsed) return lapsed;

    const { data: order, error } = await supabaseAdmin
      .from('studios')
      .select('id, onboarding_steps')
      .eq('slug', slug)
      .single();
    if (error || !order) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const steps = parseOnboardingSteps(order.onboarding_steps);
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};

    if (action === 'whatsapp') {
      const digits = String(body?.whatsapp ?? '').replace(/\D/g, '');
      // DDD + número (10 ou 11 dígitos), com ou sem o 55 na frente.
      const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
      if (local.length < 10 || local.length > 11) {
        return NextResponse.json(
          { success: false, message: 'Digite o número com DDD, por exemplo: (62) 99999-9999.' },
          { status: 400 }
        );
      }
      updates.whatsapp = normalizeWhatsappBR(local);
      steps.whatsapp = now;
    } else if (action === 'mark') {
      const step = body?.step as SelfServeStepId;
      if (!MARKABLE_STEPS.includes(step) || step === 'whatsapp') {
        return NextResponse.json({ success: false, message: 'Passo inválido.' }, { status: 400 });
      }
      if (!steps[step]) steps[step] = now;
    } else {
      return NextResponse.json({ success: false, message: 'Ação inválida.' }, { status: 400 });
    }

    updates.onboarding_steps = steps;
    const { error: updateError } = await supabaseAdmin.from('studios').update(updates).eq('id', order.id);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, steps, whatsapp: updates.whatsapp ?? undefined });
  } catch (error) {
    console.error('[Professional Onboarding Exception]:', error);
    return NextResponse.json({ success: false, message: 'Não deu pra salvar agora. Tente de novo.' }, { status: 500 });
  }
}
