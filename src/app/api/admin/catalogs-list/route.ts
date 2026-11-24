import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequestAuthorized } from '@/lib/admin-session';
import { assignAppShortCode } from '@/lib/short-link';

/** Colunas que a listagem do admin mostra (`/admin/catalogos`). */
const ADMIN_STUDIO_COLUMNS =
  'id, slug, owner_name, studio_name, whatsapp, billing_email, plan_status, cakto_plan, paid_until, manual_plan, disabled, agenda_paused, preview_expires_at, app_short_code, edit_token, created_at';

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

    return NextResponse.json({ success: true, catalogs: studios });
  } catch (error: unknown) {
    console.error('[Admin Catalogs List Exception]:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Erro interno.' }, { status: 500 });
  }
}
