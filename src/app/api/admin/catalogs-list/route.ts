import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequestAuthorized } from '@/lib/admin-session';
import { assignAppShortCode } from '@/lib/short-link';

/** Colunas que a listagem do admin mostra (`/admin/catalogos`). */
const ADMIN_STUDIO_COLUMNS =
  'id, slug, owner_name, studio_name, whatsapp, billing_email, plan_status, cakto_plan, paid_until, manual_plan, disabled, agenda_paused, preview_expires_at, app_short_code, edit_token, created_at, acquisition_source, auth_user_id';

export async function GET() {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('studios')
      .select(ADMIN_STUDIO_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Catalogs List] Erro ao buscar estúdios:', error);
      return NextResponse.json({ success: false, message: 'Erro ao buscar estúdios.' }, { status: 500 });
    }

    const studios = data || [];
    // Código curto do link do app gerado sob demanda para quem ainda não tem.
    await Promise.all(
      studios
        .filter((s) => !s.app_short_code)
        .map(async (s) => {
          s.app_short_code = await assignAppShortCode(s.id as string);
        })
    );

    // E-mail do login de cada uma (F12.1, detalhe do estúdio). O `auth_user_id`
    // em si não vai para a tela.
    const linked = studios.filter((s) => s.auth_user_id);
    const emails = new Map<string, string>();
    await Promise.all(
      linked.map(async (s) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(s.auth_user_id as string);
        if (data?.user?.email) emails.set(s.id as string, data.user.email);
      })
    );
    const catalogs = studios.map(({ auth_user_id: _authUserId, ...s }) => ({ ...s, account_email: emails.get(s.id as string) ?? null }));

    return NextResponse.json({ success: true, catalogs });
  } catch (error: unknown) {
    console.error('[Admin Catalogs List Exception]:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Erro interno.' }, { status: 500 });
  }
}
