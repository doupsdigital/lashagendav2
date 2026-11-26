import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { readTechnical, technicalSummary, type TechnicalSheet } from './client-technical';
import { countHealthAlerts, readHealth, type HealthSheet } from './client-health';

// Ficha da cliente (F8) — `client_records`, 1:1 com `clients`. Dado pessoal
// (e sensível, na aba de saúde): só o servidor lê e grava, e sempre
// conferindo antes que a cliente é do estúdio (a tabela não tem `studio_id`).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clientBelongsToStudio(studioId: string, clientId: string): Promise<boolean> {
  if (!UUID_RE.test(clientId)) return false;
  const { data, error } = await supabaseAdmin.from('clients').select('id').eq('studio_id', studioId).eq('id', clientId).maybeSingle();
  if (error) console.error('[client-sheet-service] clientBelongsToStudio:', error.message);
  return Boolean(data);
}

export interface ClientSheet {
  technical: TechnicalSheet;
  /** Vazio sem consentimento: sem autorização, a saúde nem sai do banco. */
  health: HealthSheet;
  /** Quando a cliente autorizou guardar os dados de saúde (F8.3); null se não. */
  consent_at: string | null;
  /** Última vez que a ficha (qualquer aba) foi salva; null se nunca. */
  updated_at: string | null;
}

/** Ficha da cliente (as duas abas); null se ela não é do estúdio. Sem ficha
 *  salva ainda, volta vazia. */
export async function getClientSheet(studioId: string, clientId: string): Promise<ClientSheet | null> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return null;
  const { data, error } = await supabaseAdmin
    .from('client_records')
    .select('technical, health, consent_at, updated_at')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) console.error('[client-sheet-service] getClientSheet:', error.message);
  const consentAt = (data?.consent_at as string) || null;
  return {
    technical: readTechnical(data?.technical),
    health: consentAt ? readHealth(data?.health) : {},
    consent_at: consentAt,
    updated_at: (data?.updated_at as string) || null,
  };
}

export type SaveSheetResult = { ok: true } | { ok: false; reason: 'not_found' | 'no_consent' | 'error' };

/** Grava UMA aba inteira (já validada por `cleanTechnical`/`cleanHealth`).
 *  Cria a linha na primeira vez; nas outras só troca a coluna daquela aba —
 *  a outra aba e o consentimento ficam como estão. Saúde só com consentimento. */
export async function saveClientSheetTab(
  studioId: string,
  clientId: string,
  tab: { technical: TechnicalSheet } | { health: HealthSheet }
): Promise<SaveSheetResult> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return { ok: false, reason: 'not_found' };
  if ('health' in tab) {
    const { data, error: readError } = await supabaseAdmin.from('client_records').select('consent_at').eq('client_id', clientId).maybeSingle();
    if (readError) {
      console.error('[client-sheet-service] saveClientSheetTab consent:', readError.message);
      return { ok: false, reason: 'error' };
    }
    if (!data?.consent_at) return { ok: false, reason: 'no_consent' };
  }
  const { error } = await supabaseAdmin.from('client_records').upsert({ client_id: clientId, ...tab }, { onConflict: 'client_id' });
  if (error) {
    // Só a mensagem: o objeto do erro pode trazer os dados da ficha.
    console.error('[client-sheet-service] saveClientSheetTab:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true };
}

export type ConsentResult = { ok: true; consent_at: string | null } | { ok: false; reason: 'not_found' | 'error' };

/** Registra que a cliente autorizou (agora). Já autorizado: mantém a data. */
export async function giveClientConsent(studioId: string, clientId: string): Promise<ConsentResult> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return { ok: false, reason: 'not_found' };
  const { data: current } = await supabaseAdmin.from('client_records').select('consent_at').eq('client_id', clientId).maybeSingle();
  if (current?.consent_at) return { ok: true, consent_at: current.consent_at as string };
  const consentAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from('client_records').upsert({ client_id: clientId, consent_at: consentAt }, { onConflict: 'client_id' });
  if (error) {
    console.error('[client-sheet-service] giveClientConsent:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true, consent_at: consentAt };
}

/** Retira a autorização e APAGA as respostas de saúde (LGPD: sem
 *  consentimento, o dado sensível não fica guardado). A ficha técnica fica. */
export async function revokeClientConsent(studioId: string, clientId: string): Promise<ConsentResult> {
  if (!(await clientBelongsToStudio(studioId, clientId))) return { ok: false, reason: 'not_found' };
  const { error } = await supabaseAdmin.from('client_records').update({ consent_at: null, health: {} }).eq('client_id', clientId);
  if (error) {
    console.error('[client-sheet-service] revokeClientConsent:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true, consent_at: null };
}

/** O que a agenda mostra da ficha no detalhe do agendamento (F8.4): o resumo
 *  da técnica e QUANTOS pontos de atenção de saúde — nunca o texto. */
export interface SheetHighlight {
  summary: string | null;
  healthAlerts: number;
}

/** Destaques da ficha das clientes de uma lista (as da agenda na tela). Só
 *  cliente do estúdio (filtro pelo `studio_id` da cliente); quem não tem nada
 *  a mostrar fica de fora do mapa. Saúde só conta com consentimento. */
export async function getSheetHighlights(studioId: string, clientIds: string[]): Promise<Record<string, SheetHighlight>> {
  const ids = [...new Set(clientIds.filter((id) => UUID_RE.test(id)))];
  const out: Record<string, SheetHighlight> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await supabaseAdmin
      .from('client_records')
      .select('client_id, technical, health, consent_at, clients!inner(studio_id)')
      .eq('clients.studio_id', studioId)
      .in('client_id', chunk);
    if (error) {
      console.error('[client-sheet-service] getSheetHighlights:', error.message);
      continue;
    }
    for (const row of (data || []) as Record<string, unknown>[]) {
      const summary = technicalSummary(readTechnical(row.technical));
      const healthAlerts = row.consent_at ? countHealthAlerts(readHealth(row.health)) : 0;
      if (summary || healthAlerts > 0) out[row.client_id as string] = { summary, healthAlerts };
    }
  }
  return out;
}
