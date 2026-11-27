import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { sendPushToStudio } from '@/lib/push-notifications';
import { checkRateLimit } from '@/lib/rate-limit';

/** POST /api/professional/push-test
 *  Manda uma notificação de teste pros dispositivos inscritos do catálogo.
 *  Existe porque a permissão que o site pede (`Notification.permission`)
 *  pode aparecer como concedida mesmo com a notificação do Chrome desligada
 *  no nível do Android — o único jeito confiável de saber se realmente
 *  funciona é mandar uma de verdade e perguntar pra profissional se chegou. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const slug = (body?.slug || '').toLowerCase().trim();
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const isAuthorized = await isProfessionalRequestAuthorized(slug);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabaseAdmin.from('studios').select('id').eq('slug', slug).single();
    if (orderError || !order) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    // Teste manda para todos os aparelhos dela: limite curto contra toques
    // repetidos (F12.3).
    if (!(await checkRateLimit(`push-test:${order.id}`, 6, 10 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitos testes seguidos. Espere alguns minutos.' }, { status: 429 });
    }

    const result = await sendPushToStudio(order.id, {
      title: 'Notificação de teste',
      body: 'Se você recebeu isso, as notificações do LashAgenda estão funcionando neste aparelho.',
      url: `/app/${slug}/config`,
    });

    // `configured`/`devices`/`sent` deixam a tela dizer o motivo quando não
    // chega (F12.3) em vez de só perguntar "recebeu?".
    return NextResponse.json({ success: result.sent > 0, ...result });
  } catch (error) {
    console.error('[Push Test Exception]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
