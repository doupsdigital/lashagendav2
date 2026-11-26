import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { isValidClientWhatsapp, normalizeClientWhatsapp } from '../scheduling/client-phone';
import { cleanBusinessProfile, type BusinessProfileInput, type CleanBusinessProfile } from './business-profile';

/** O que a seção "Meu negócio" mostra (F10.1). WhatsApp sem o 55. */
export interface BusinessProfile {
  owner_name: string;
  studio_name: string;
  whatsapp: string;
  instagram: string;
  address: string;
  maps_url: string;
  avatar_url: string | null;
}

export async function getBusinessProfile(studioId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('studios')
    .select('owner_name, studio_name, whatsapp, instagram, address, maps_url, avatar_url')
    .eq('id', studioId)
    .maybeSingle();
  if (error) console.error('[business-service] leitura:', error.message);
  if (!data) return null;
  return {
    owner_name: data.owner_name || '',
    studio_name: data.studio_name || '',
    whatsapp: normalizeClientWhatsapp(data.whatsapp),
    instagram: (data.instagram || '').replace(/^@/, ''),
    address: data.address || '',
    maps_url: data.maps_url || '',
    avatar_url: data.avatar_url || null,
  };
}

export type SaveBusinessResult =
  | { ok: true; data: CleanBusinessProfile & { whatsapp: string } }
  | { ok: false; field?: string; message: string; status: number };

/** Confere e grava. O WhatsApp vai no mesmo formato que o editor do
 *  catálogo grava (com o 55 do país). */
export async function saveBusinessProfile(studioId: string, input: BusinessProfileInput & { whatsapp?: unknown }): Promise<SaveBusinessResult> {
  const clean = cleanBusinessProfile(input);
  if (!clean.ok) return { ok: false, field: clean.field, message: clean.message, status: 400 };

  const phone = normalizeClientWhatsapp(typeof input.whatsapp === 'string' ? input.whatsapp : '');
  if (!phone) return { ok: false, field: 'whatsapp', message: 'Escreva o seu WhatsApp, com DDD.', status: 400 };
  if (!isValidClientWhatsapp(phone)) return { ok: false, field: 'whatsapp', message: 'Esse WhatsApp não parece certo. Confira o DDD e o número.', status: 400 };

  const row = { ...clean.data, whatsapp: `55${phone}` };
  const { error } = await supabaseAdmin.from('studios').update(row).eq('id', studioId);
  if (error) {
    console.error('[business-service] gravação:', error.message);
    return { ok: false, message: 'Não foi possível salvar. Tente de novo.', status: 500 };
  }
  return { ok: true, data: { ...clean.data, whatsapp: phone } };
}
