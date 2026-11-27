import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';
import { isAccessLapsed, type StudioAccessFields } from './studio-access';

/** Acesso vencido = app só leitura (F11.7, decisão da dona em 2026-11-27).
 *  Ela continua vendo agenda, clientes e fichas (os dados são dela), mas
 *  nenhuma rota que cria ou altera algo aceita. Ficam liberados: entrar/sair,
 *  criar acesso, notificações e o que a LGPD pede que ela sempre consiga
 *  atender — apagar uma cliente e retirar a autorização da ficha de saúde. */
export const ACCESS_LAPSED_MESSAGE = 'Seu acesso venceu. Renove no Início para voltar a editar. Nada foi apagado.';

type AccessFields = Pick<StudioAccessFields, 'plan_status' | 'paid_until' | 'manual_plan'>;

export function lapsedResponse(studio: AccessFields | null | undefined): NextResponse | null {
  if (!studio || !isAccessLapsed(studio)) return null;
  return NextResponse.json({ success: false, code: 'access_lapsed', message: ACCESS_LAPSED_MESSAGE }, { status: 403 });
}

export async function lapsedResponseForSlug(slug: string): Promise<NextResponse | null> {
  const { data } = await supabaseAdmin
    .from('studios')
    .select('plan_status, paid_until, manual_plan')
    .eq('slug', slug)
    .maybeSingle();
  return lapsedResponse(data as AccessFields | null);
}
