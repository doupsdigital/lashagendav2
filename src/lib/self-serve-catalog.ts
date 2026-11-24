import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { buildServicesPayload, buildStudioInsertPayload, resolveProfessionalSlug } from './studio-service';
import { generateCode } from './short-link';
import { nichePresetsMap } from '@/data/niche-presets';

/** Duração da prévia gratuita da página de venda. */
export const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;

/** Serviços de exemplo com que o estúdio nasce: 4 extensões de cílios +
 *  2 de sobrancelha — assim a capa já mostra as duas "cápsulas" de
 *  categoria. Ela troca pelos dela depois de pagar. (Quantos e quais: decisão
 *  pendente da F3.4.) */
const PREVIEW_PROCEDURE_IDS = ['brasileiro', 'classico', 'egipcio', 'hibrido', 'design-sobrancelha', 'sobrancelha-henna'];

export type CreateSelfServeResult =
  | { ok: true; studioId: string; slug: string; previewCode: string; previewExpiresAt: string | null }
  | { ok: false; reason: 'invalid_name' | 'slug_taken' | 'db_error'; attemptedSlug?: string };

interface CreateSelfServeInput {
  name: string;
  /** true = prévia de 24h (página de venda). false = estúdio criado direto
   *  pelo webhook (compra na Cakto sem prévia encontrada) — nasce como
   *  `active`, e o próprio webhook grava plano e `paid_until` em seguida. */
  asPreview: boolean;
  acquisitionSource: string;
  whatsappNumber?: string;
  /** Webhook não pode falhar por slug ocupado (a venda já aconteceu): tenta
   *  sufixos legíveis (`studio`, `lash`) antes de desistir. */
  allowSlugSuffix?: boolean;
}

/** Apaga uma prévia vencida e nunca paga que esteja ocupando o slug —
 *  libera o nome para outra pessoa (ou ela mesma) gerar de novo sem esperar
 *  a limpeza diária. Nunca apaga estúdio pago. */
async function releaseExpiredPreviewSlug(slug: string): Promise<void> {
  await supabaseAdmin
    .from('studios')
    .delete()
    .eq('slug', slug)
    .eq('plan_status', 'preview')
    .lt('preview_expires_at', new Date().toISOString());
}

async function resolveSlug(name: string, allowSuffix: boolean) {
  const first = await resolveProfessionalSlug(name);
  if (first.ok) return first;
  if (first.attemptedSlug) {
    await releaseExpiredPreviewSlug(first.attemptedSlug);
    const retry = await resolveProfessionalSlug(name);
    if (retry.ok || !allowSuffix) return retry;
  }
  if (allowSuffix) {
    for (const suffix of ['studio', 'lash', 'lashdesigner']) {
      const attempt = await resolveProfessionalSlug(`${name} ${suffix}`);
      if (attempt.ok) return attempt;
    }
  }
  return first;
}

/** Cria um estúdio com os serviços de exemplo. Usado pela geração da prévia
 *  e pelo webhook da Cakto (compra sem prévia). Nunca devolve o `edit_token`. */
export async function createSelfServeLashCatalog(input: CreateSelfServeInput): Promise<CreateSelfServeResult> {
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (name.replace(/[^\p{L}]/gu, '').length < 2) return { ok: false, reason: 'invalid_name' };

  const slugResult = await resolveSlug(name, Boolean(input.allowSlugSuffix));
  if (!slugResult.ok) return { ok: false, reason: 'slug_taken', attemptedSlug: slugResult.attemptedSlug };

  const preset = nichePresetsMap.lash;
  const previewExpiresAt = input.asPreview ? new Date(Date.now() + PREVIEW_TTL_MS).toISOString() : null;

  let studioId: string | null = null;
  let previewCode = '';
  // `preview_code` é UNIQUE — em caso (raríssimo) de colisão, tenta outro.
  for (let attempt = 0; attempt < 5 && !studioId; attempt += 1) {
    previewCode = generateCode();
    const { data, error } = await supabaseAdmin
      .from('studios')
      .insert({
        ...buildStudioInsertPayload({
          slug: slugResult.slug,
          ownerName: name,
          whatsapp: input.whatsappNumber || '',
          // Vazio de propósito: sem capa própria, a Capa usa a foto padrão.
          coverUrl: '',
        }),
        plan_status: input.asPreview ? 'preview' : 'active',
        preview_expires_at: previewExpiresAt,
        preview_code: previewCode,
        acquisition_source: input.acquisitionSource,
      })
      .select('id')
      .single();

    if (!error && data) {
      studioId = data.id as string;
      break;
    }
    if (error?.code !== '23505' || !String(error.message || '').includes('preview_code')) {
      console.error('[SelfServeCatalog] Erro ao criar estúdio:', error);
      return { ok: false, reason: 'db_error' };
    }
  }

  if (!studioId) return { ok: false, reason: 'db_error' };

  const procedures = preset.procedures.filter((p) => PREVIEW_PROCEDURE_IDS.includes(p.id));
  const { error: servicesErr } = await supabaseAdmin
    .from('services')
    .insert(buildServicesPayload(procedures.length ? procedures : preset.procedures.slice(0, 6), studioId));

  if (servicesErr) {
    console.error('[SelfServeCatalog] Erro ao gravar serviços:', servicesErr);
    await supabaseAdmin.from('studios').delete().eq('id', studioId);
    return { ok: false, reason: 'db_error' };
  }

  return { ok: true, studioId, slug: slugResult.slug, previewCode, previewExpiresAt };
}
