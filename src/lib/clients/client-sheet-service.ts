import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { readTechnical, type TechnicalSheet } from './client-technical';

// Ficha da cliente (F8) — `client_records`, 1:1 com `clients`. Dado pessoal
// (e, na F8.2, sensível): só o servidor lê e grava, e sempre conferindo antes
// que a cliente é do estúdio (a tabela não tem `studio_id`).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clientBelongsToStudio(studioId: string, clientId: string): Promise<boolean> {
  if (!UUID_RE.test(clientId)) return false;
  const { data, error } = await supabaseAdmin.from('clients').select('id').eq('studio_id', studioId).eq('id', clientId).maybeSingle();
  if (error) console.error('[client-sheet-service] clientBelongsToStudio:', error);
  return Boolean(data);
}

export interface ClientTechnicalRecord {
  technical: TechnicalSheet;
  /** Última vez que a ficha (qualquer aba) foi salva; null se nunca. */
  updated_at: string | null;
}

/** Ficha técnica da cliente; null se ela não é do estúdio. Sem ficha salva
 *  ainda, volta vazia. */
export async function getClientTechnical(studioId: string, clientId: string): Promise<ClientTechnicalRecord | null> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return null;
  const { data, error } = await supabaseAdmin.from('client_records').select('technical, updated_at').eq('client_id', clientId).maybeSingle();
  if (error) console.error('[client-sheet-service] getClientTechnical:', error);
  return { technical: readTechnical(data?.technical), updated_at: (data?.updated_at as string) || null };
}

export type SaveTechnicalResult = { ok: true } | { ok: false; reason: 'not_found' | 'error' };

/** Grava a ficha técnica inteira (já validada por `cleanTechnical`). Cria a
 *  linha na primeira vez; nas outras só troca `technical` — a aba de saúde
 *  (`health`) e o consentimento ficam como estão. */
export async function saveClientTechnical(studioId: string, clientId: string, technical: TechnicalSheet): Promise<SaveTechnicalResult> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return { ok: false, reason: 'not_found' };
  const { error } = await supabaseAdmin.from('client_records').upsert({ client_id: clientId, technical }, { onConflict: 'client_id' });
  if (error) {
    console.error('[client-sheet-service] saveClientTechnical:', error);
    return { ok: false, reason: 'error' };
  }
  return { ok: true };
}
