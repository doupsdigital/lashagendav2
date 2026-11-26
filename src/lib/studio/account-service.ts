import 'server-only';
import { supabaseAdmin } from '../supabase-admin';

/** E-mail do login vinculado ao estúdio (F10.4), para "Minha conta" mostrar
 *  com qual conta ela entra. null = sem login vinculado ou não achou. */
export async function getLinkedAccountEmail(authUserId: string | null): Promise<string | null> {
  if (!authUserId) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(authUserId);
    if (error) {
      console.error('[account-service] usuário:', error.message);
      return null;
    }
    return data.user?.email ?? null;
  } catch (e) {
    console.error('[account-service] usuário:', e instanceof Error ? e.message : e);
    return null;
  }
}
