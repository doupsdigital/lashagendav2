import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequestAuthorized } from '@/lib/admin-session';

/** PATCH /api/admin/catalog-actions  { id, disabled?, manual_plan?, agenda_paused? }
 *  Ajustes manuais do admin num estúdio. A cobrança em si (plano, pago até)
 *  é do webhook da Cakto ou de `/api/admin/cakto`. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      disabled?: boolean;
      manual_plan?: boolean;
      agenda_paused?: boolean;
    };
    if (!body.id) {
      return NextResponse.json({ success: false, message: 'id é obrigatório.' }, { status: 400 });
    }

    const updates: Record<string, boolean> = {};
    if (typeof body.disabled === 'boolean') updates.disabled = body.disabled;
    if (typeof body.manual_plan === 'boolean') updates.manual_plan = body.manual_plan;
    if (typeof body.agenda_paused === 'boolean') updates.agenda_paused = body.agenda_paused;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: 'Nada para atualizar.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('studios').update(updates).eq('id', body.id);
    if (error) {
      console.error('[Admin Catalog Actions] Erro ao atualizar:', error);
      return NextResponse.json({ success: false, message: 'Erro ao atualizar o estúdio.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Admin Catalog Actions Exception]:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Erro interno.' }, { status: 500 });
  }
}

/** DELETE /api/admin/catalog-actions  { id }
 *  Apaga o estúdio e tudo dele (serviços, clientes, fichas, agendamentos). */
export async function DELETE(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ success: false, message: 'id é obrigatório.' }, { status: 400 });
    }

    const { data: studio } = await supabaseAdmin.from('studios').select('auth_user_id').eq('id', id).maybeSingle();
    const { error } = await supabaseAdmin.from('studios').delete().eq('id', id);
    if (error) {
      console.error('[Admin Catalog Actions] Erro ao excluir estúdio:', error);
      return NextResponse.json({ success: false, message: 'Erro ao excluir o estúdio.' }, { status: 500 });
    }
    // O login dela (Supabase Auth) sai junto — sem estúdio, ele não serve
    // para nada e guardaria o e-mail à toa (F12.1).
    if (studio?.auth_user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studio.auth_user_id);
      if (authError) console.error('[Admin Catalog Actions] login não apagado:', authError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Admin Catalog Actions Exception]:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Erro interno.' }, { status: 500 });
  }
}
