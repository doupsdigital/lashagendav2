import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { readTechnical, type TechnicalSheet } from './client-technical';
import { readHealth, type HealthSheet } from './client-health';

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

export interface ClientSheet {
  technical: TechnicalSheet;
  health: HealthSheet;
  /** Última vez que a ficha (qualquer aba) foi salva; null se nunca. */
  updated_at: string | null;
}

/** Ficha da cliente (as duas abas); null se ela não é do estúdio. Sem ficha
 *  salva ainda, volta vazia. */
export async function getClientSheet(studioId: string, clientId: string): Promise<ClientSheet | null> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return null;
  const { data, error } = await supabaseAdmin.from('client_records').select('technical, health, updated_at').eq('client_id', clientId).maybeSingle();
  if (error) console.error('[client-sheet-service] getClientSheet:', error.message);
  return { technical: readTechnical(data?.technical), health: readHealth(data?.health), updated_at: (data?.updated_at as string) || null };
}

export type SaveSheetResult = { ok: true } | { ok: false; reason: 'not_found' | 'error' };

/** Grava UMA aba inteira (já validada por `cleanTechnical`/`cleanHealth`).
 *  Cria a linha na primeira vez; nas outras só troca a coluna daquela aba —
 *  a outra aba e o consentimento ficam como estão. */
export async function saveClientSheetTab(
  studioId: string,
  clientId: string,
  tab: { technical: TechnicalSheet } | { health: HealthSheet }
): Promise<SaveSheetResult> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return { ok: false, reason: 'not_found' };
  const { error } = await supabaseAdmin.from('client_records').upsert({ client_id: clientId, ...tab }, { onConflict: 'client_id' });
  if (error) {
    // Só a mensagem: o objeto do erro pode trazer os dados da ficha.
    console.error('[client-sheet-service] saveClientSheetTab:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true };
}
