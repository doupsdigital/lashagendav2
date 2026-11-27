import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { servicesLookEdited, type SelfServeFacts } from './self-serve-onboarding';

/** O que o checklist "Primeiros passos" descobre olhando o banco (F11.5):
 *  horário salvo e serviços mexidos. Ver `self-serve-onboarding.ts`.
 *  `services.updated_at` nasce com o `created_at` e o trigger atualiza a
 *  cada gravação — então o maior `updated_at` cobre serviço novo e editado. */
export async function getSelfServeFacts(studio: { id: string; created_at: string; auth_user_id: string | null }): Promise<SelfServeFacts> {
  const [hours, latest] = await Promise.all([
    supabaseAdmin.from('business_hours').select('weekday', { count: 'exact', head: true }).eq('studio_id', studio.id),
    supabaseAdmin.from('services').select('updated_at').eq('studio_id', studio.id).order('updated_at', { ascending: false }).limit(1),
  ]);
  const latestChange = typeof latest.data?.[0]?.updated_at === 'string' ? latest.data[0].updated_at : null;
  return {
    hasAccount: Boolean(studio.auth_user_id),
    hoursDone: (hours.count ?? 0) > 0,
    servicesEdited: servicesLookEdited(studio.created_at, latestChange),
  };
}
