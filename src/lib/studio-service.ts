import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { normalizeWhatsappBR } from './format';
import { RESERVED_SLUGS } from './reserved-slugs';
import { parseOnboardingSteps, type OnboardingSteps } from './self-serve-onboarding';
import { hasPaidAccess, isAccessLapsed, isBookingLive } from './studio-access';
import { randomUUID } from 'node:crypto';
import { resolveDurationMinutes, toNumberOrNull } from './service-format';
import { nichePresetsMap } from '@/data/niche-presets';
import type { CatalogOrderData, ProcedureItem, ProcedureVariation } from '@/types/catalog';
import type { BookingMode, CaktoPlan, PlanStatus, ServiceRow, ServiceVariationRow, StudioRow } from '@/types/studio';

/** Camada de dados do estúdio (F2.2) — substitui `catalog-service.ts`,
 *  `professional-app-service.ts` e `order-payload.ts` do StudioMenu.
 *  Lê/grava `studios` e `services` e monta o formato das telas do catálogo
 *  (`CatalogOrderData`/`ProcedureItem`). */

export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Leitura bruta
// ---------------------------------------------------------------------------

export async function getStudioBySlug(slug: string): Promise<StudioRow | null> {
  const { data, error } = await supabaseAdmin.from('studios').select('*').eq('slug', normalizeSlug(slug)).maybeSingle();
  if (error) console.error('[studio-service] getStudioBySlug:', error);
  return (data as StudioRow | null) ?? null;
}

export async function getStudioById(id: string): Promise<StudioRow | null> {
  const { data, error } = await supabaseAdmin.from('studios').select('*').eq('id', id).maybeSingle();
  if (error) console.error('[studio-service] getStudioById:', error);
  return (data as StudioRow | null) ?? null;
}

/** Serviços do estúdio na ordem do catálogo. Por padrão só os ativos. */
export async function getStudioServices(studioId: string, options?: { includeInactive?: boolean }): Promise<ServiceRow[]> {
  let query = supabaseAdmin.from('services').select('*').eq('studio_id', studioId);
  if (!options?.includeInactive) query = query.eq('active', true);
  const { data, error } = await query.order('position', { ascending: true });
  if (error) console.error('[studio-service] getStudioServices:', error);
  return (data as ServiceRow[] | null) ?? [];
}

/** Variações dos serviços informados, na ordem do catálogo. */
export async function getServiceVariations(serviceIds: string[]): Promise<ServiceVariationRow[]> {
  if (serviceIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('service_variations')
    .select('*')
    .in('service_id', serviceIds)
    .order('position', { ascending: true });
  if (error) console.error('[studio-service] getServiceVariations:', error);
  return (data as ServiceVariationRow[] | null) ?? [];
}

// ---------------------------------------------------------------------------
// Serviço <-> ProcedureItem (formato das telas do catálogo)
// ---------------------------------------------------------------------------

function variationToProcedure(v: ServiceVariationRow): ProcedureVariation {
  return {
    id: v.id,
    name: v.name,
    duration_minutes: resolveDurationMinutes(v.duration_minutes),
    price: toNumberOrNull(v.price),
  };
}

export function serviceToProcedure(s: ServiceRow, variations: ServiceVariationRow[] = []): ProcedureItem {
  return {
    id: s.id,
    title: s.title,
    description: s.description || '',
    price: toNumberOrNull(s.price),
    price_from: Boolean(s.price_from),
    duration_minutes: resolveDurationMinutes(s.duration_minutes),
    bookable: s.bookable,
    active: s.active,
    category: s.category || 'Geral',
    image_url: s.image_url || '',
    extra_photos: Array.isArray(s.extra_photos) ? s.extra_photos : [],
    badge: s.badge || '',
    is_highlight: s.is_highlight,
    specs: cleanSpecs(s.specs),
    variations: variations.filter((v) => v.service_id === s.id).map(variationToProcedure),
  };
}

/** Investimento e Duração saem dos números do serviço — linhas com esses
 *  nomes nos `specs` (herança do StudioMenu, que gravava o texto ali) são
 *  descartadas para não aparecer em dobro nem ficar desatualizadas. */
const DERIVED_SPEC_KEYS = new Set(['investimento', 'duração', 'duracao']);

function cleanSpecs(specs: unknown): [string, string][] {
  if (!Array.isArray(specs)) return [];
  return specs.filter(
    (row): row is [string, string] =>
      Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string' && !DERIVED_SPEC_KEYS.has(row[0].trim().toLowerCase())
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só um UUID é id de verdade do banco. Serviço ainda não salvo carrega um
 *  id provisório gerado no navegador — esse vira INSERT, nunca UPDATE. */
export function isValidServiceId(id: string | null | undefined): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

/** Linhas de `services` a partir da lista do editor. Com id de banco válido o
 *  `id` vai junto (upsert mantém o id estável — agendamentos apontam para ele). */
export function buildServicesPayload(procedures: ProcedureItem[], studioId: string) {
  return procedures.map((p, index) => {
    const price = toNumberOrNull(p.price);
    const row: Record<string, unknown> = {
      studio_id: studioId,
      position: index,
      title: (p.title || '').trim() || 'Serviço',
      description: p.description || null,
      category: p.category || 'Geral',
      price: price !== null && price >= 0 ? Math.round(price * 100) / 100 : null,
      price_from: price !== null && Boolean(p.price_from),
      duration_minutes: resolveDurationMinutes(p.duration_minutes),
      image_url: p.image_url || null,
      extra_photos: p.extra_photos || [],
      badge: p.badge || null,
      is_highlight: Boolean(p.is_highlight),
      specs: cleanSpecs(p.specs),
      bookable: p.bookable !== false,
      active: p.active !== false,
    };
    if (isValidServiceId(p.id)) row.id = p.id;
    return row;
  });
}

/** Limite de variações por serviço aceito no salvar. */
export const MAX_VARIATIONS_PER_SERVICE = 20;

/** Linhas de `service_variations` de um serviço a partir do editor. Variação
 *  com id que já é deste serviço (`ownIds`) mantém o id (agendamentos
 *  apontam para ela); a nova ganha um UUID gerado aqui, devolvido no
 *  `idMap` para o editor trocar o id provisório. Sem nome = descartada. */
export function buildVariationRows(
  variations: ProcedureVariation[] | undefined,
  serviceId: string,
  ownIds: Set<string>,
  idMap: Record<string, string>
) {
  return (variations || [])
    .filter((v) => (v.name || '').trim())
    .slice(0, MAX_VARIATIONS_PER_SERVICE)
    .map((v, index) => {
      let id = v.id;
      if (!isValidServiceId(id) || !ownIds.has(id)) {
        id = randomUUID();
        if (v.id) idMap[v.id] = id;
      }
      const price = toNumberOrNull(v.price);
      return {
        id,
        service_id: serviceId,
        position: index,
        name: v.name.trim().slice(0, 80),
        duration_minutes: resolveDurationMinutes(v.duration_minutes),
        price: price !== null && price >= 0 ? Math.round(price * 100) / 100 : null,
      };
    });
}

/** Grava serviços novos (sem id de banco) e as variações deles num estúdio —
 *  usado para os serviços de exemplo de um estúdio recém-criado. */
export async function insertStudioServices(studioId: string, procedures: ProcedureItem[]): Promise<{ ok: boolean }> {
  const rows = buildServicesPayload(procedures, studioId).map(({ id: _id, ...row }) => row);
  if (rows.length === 0) return { ok: true };

  const { data: inserted, error } = await supabaseAdmin.from('services').insert(rows).select('id, position');
  if (error) {
    console.error('[studio-service] insertStudioServices (serviços):', error);
    return { ok: false };
  }

  const variationRows = (inserted || []).flatMap((r) =>
    buildVariationRows(procedures[r.position as number]?.variations, r.id as string, new Set(), {})
  );
  if (variationRows.length > 0) {
    const { error: varErr } = await supabaseAdmin.from('service_variations').insert(variationRows);
    if (varErr) {
      console.error('[studio-service] insertStudioServices (variações):', varErr);
      return { ok: false };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Catálogo público / editor
// ---------------------------------------------------------------------------

const DEFAULT_INSTRUCTIONS = [
  { id: 'confirmacao', title: 'Confirmação', description: 'Até um dia antes do seu horário marcado.' },
  { id: 'pontualidade', title: 'Pontualidade', description: 'Tolerância máxima de 15 minutos de atraso.' },
  { id: 'preparacao', title: 'Preparação', description: 'Venha com a região dos olhos sem maquiagem.' },
  { id: 'pagamento', title: 'Pagamento', description: 'Dinheiro, Pix, cartão de débito ou crédito.' },
];

export function studioToCatalog(
  studio: StudioRow,
  services: ServiceRow[],
  variations: ServiceVariationRow[] = []
): CatalogOrderData {
  const ownerName = studio.owner_name || studio.slug;
  return {
    id: studio.id,
    slug: studio.slug,
    edit_token: studio.edit_token,
    booking_enabled: isBookingLive(studio),
    booking_mode: studio.booking_mode,
    booking_window_days: studio.booking_window_days,
    post_booking_message: studio.post_booking_message || '',
    agenda_paused: studio.agenda_paused,
    catalog_disabled: studio.disabled,
    catalog_payment_lapsed: isAccessLapsed(studio),
    plan_status: studio.plan_status,
    preview_expires_at: studio.preview_expires_at,
    client_name: ownerName,
    studio_name: studio.studio_name || `Studio ${ownerName}`,
    studio_label: studio.studio_label || 'STUDIO',
    hero_phrase: studio.hero_phrase || 'A arte de transformar a sua beleza com leveza e precisão.',
    bio_description: studio.bio || '',
    avatar_url: studio.avatar_url || studio.cover_media_url || undefined,
    cover_media_url: studio.cover_media_url || studio.avatar_url || undefined,
    niche: 'lash',
    layout_model: studio.layout_model === 'classico' ? 'classico' : 'mosaico',
    theme_variant: studio.theme_variant === 'luxury' ? 'luxury' : 'rose',
    whatsapp_number: normalizeWhatsappBR(studio.whatsapp),
    instagram_handle: studio.instagram || '',
    address: studio.address || '',
    maps_url: studio.maps_url || '',
    instructions_bg_url: studio.instructions_bg_url || undefined,
    final_screen_bg_url: studio.final_screen_bg_url || undefined,
    cta_bg_url: studio.cta_bg_url || undefined,
    categories: Array.isArray(studio.categories) ? studio.categories : [],
    procedures: services.map((s) => serviceToProcedure(s, variations)),
    instructions: {
      items: Array.isArray(studio.instructions_items) ? studio.instructions_items : DEFAULT_INSTRUCTIONS,
    },
    created_at: studio.created_at,
    updated_at: studio.updated_at,
  };
}

/** Estúdio + serviços (com variações) no formato do catálogo. Por padrão só
 *  os ativos; o editor pede `includeInactive` — salvar apaga o que não veio,
 *  então o editor tem de receber todos. Inclui o `edit_token` — quem
 *  renderiza no navegador tem de removê-lo antes (ver `/c/[slug]`). */
export async function getCatalogBySlug(
  slug: string,
  options?: { includeInactive?: boolean }
): Promise<CatalogOrderData | null> {
  const studio = await getStudioBySlug(slug);
  if (!studio) return null;
  const services = await getStudioServices(studio.id, options);
  const variations = await getServiceVariations(services.map((s) => s.id));
  return studioToCatalog(studio, services, variations);
}

/** Colunas de `studios` que o editor visual do catálogo grava. */
export function buildStudioUpdateFromCatalog(data: CatalogOrderData) {
  return {
    owner_name: (data.client_name || '').trim() || undefined,
    studio_name: data.studio_name || null,
    studio_label: data.studio_label || null,
    hero_phrase: data.hero_phrase || null,
    bio: data.bio_description || null,
    whatsapp: normalizeWhatsappBR(data.whatsapp_number) || null,
    instagram: data.instagram_handle || null,
    address: data.address || null,
    maps_url: data.maps_url || null,
    avatar_url: data.avatar_url || null,
    cover_media_url: data.cover_media_url || null,
    instructions_bg_url: data.instructions_bg_url || null,
    final_screen_bg_url: data.final_screen_bg_url || null,
    cta_bg_url: data.cta_bg_url || null,
    layout_model: data.layout_model === 'classico' ? 'classico' : 'mosaico',
    theme_variant: data.theme_variant === 'luxury' ? 'luxury' : 'rose',
    instructions_items: data.instructions?.items || [],
    categories: data.categories || [],
  };
}

// ---------------------------------------------------------------------------
// Criação de estúdio
// ---------------------------------------------------------------------------

/** Uma "palavra" do nome pronta para virar pedaço de slug: minúscula, sem
 *  acento, só letras e números. */
function normalizeNameWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type ProfessionalSlugResult = { ok: true; slug: string } | { ok: false; attemptedSlug: string };

/** Slug a partir do NOME (nunca número aleatório): as 2 primeiras palavras
 *  ("Ana Laura Alves" → `analaura`); se ocupado ou reservado, tenta com a
 *  próxima palavra do nome, e assim por diante. Sem mais palavras → `ok: false`. */
export async function resolveProfessionalSlug(fullName: string): Promise<ProfessionalSlugResult> {
  const words = fullName.trim().split(/\s+/).map(normalizeNameWord).filter(Boolean);
  if (words.length === 0) return { ok: false, attemptedSlug: '' };

  let count = Math.min(2, words.length);
  for (;;) {
    const candidate = words.slice(0, count).join('').slice(0, 50);
    let taken = RESERVED_SLUGS.includes(candidate);
    if (!taken) {
      const { data } = await supabaseAdmin.from('studios').select('id').eq('slug', candidate).maybeSingle();
      taken = Boolean(data);
    }
    if (!taken) return { ok: true, slug: candidate };
    if (count >= words.length) return { ok: false, attemptedSlug: candidate };
    count += 1;
  }
}

export interface StudioInsertInput {
  slug: string;
  ownerName: string;
  whatsapp?: string;
  instagram?: string;
  coverUrl?: string;
}

/** Payload para criar um estúdio novo. Textos e imagens de fundo vêm do
 *  preset Lash (a profissional troca depois no editor). */
export function buildStudioInsertPayload(input: StudioInsertInput) {
  const preset = nichePresetsMap.lash;
  return {
    slug: input.slug,
    owner_name: input.ownerName,
    studio_name: `Studio ${input.ownerName}`,
    hero_phrase: preset.hero_phrase || null,
    bio: preset.bio_description || null,
    whatsapp: normalizeWhatsappBR(input.whatsapp) || null,
    instagram: input.instagram || null,
    cover_media_url: input.coverUrl || null,
    avatar_url: input.coverUrl || null,
    instructions_bg_url: preset.instructions_bg_url || null,
    final_screen_bg_url: preset.final_screen_bg_url || null,
    cta_bg_url: preset.cta_bg_url || null,
    layout_model: preset.layout_model,
    theme_variant: preset.theme_variant,
    instructions_items: preset.instructions?.items || [],
  };
}

// ---------------------------------------------------------------------------
// App da profissional (/app/[slug])
// ---------------------------------------------------------------------------

export interface ProfessionalStudio {
  id: string;
  slug: string;
  edit_token: string;
  /** Nome da profissional (exibido como "Boa tarde, Fernanda"). */
  client_name: string;
  studio_name?: string;
  whatsapp_number: string;
  plan_status: PlanStatus;
  /** Pagante em dia (ou liberado pelo admin): app completo. */
  has_paid_access: boolean;
  /** Agendamento pelo catálogo funcionando agora para a cliente final. */
  booking_live: boolean;
  booking_mode: BookingMode;
  agenda_paused: boolean;
  manual_plan: boolean;
  auth_user_id: string | null;
  billing_email?: string;
  paid_until: string | null;
  cakto_plan: CaktoPlan | null;
  /** Vai no `sck` do checkout quando ela renova/reativa — a compra cai neste estúdio. */
  cakto_checkout_ref: string | null;
  onboarding_steps: OnboardingSteps;
  created_at: string;
}

export function studioToProfessional(studio: StudioRow): ProfessionalStudio {
  return {
    id: studio.id,
    slug: studio.slug,
    edit_token: studio.edit_token,
    client_name: studio.owner_name || studio.slug,
    studio_name: studio.studio_name || undefined,
    whatsapp_number: studio.whatsapp || '',
    plan_status: studio.plan_status,
    has_paid_access: hasPaidAccess(studio),
    booking_live: isBookingLive(studio),
    booking_mode: studio.booking_mode,
    agenda_paused: studio.agenda_paused,
    manual_plan: studio.manual_plan,
    auth_user_id: studio.auth_user_id,
    billing_email: studio.billing_email || undefined,
    paid_until: studio.paid_until,
    cakto_plan: studio.cakto_plan,
    cakto_checkout_ref: studio.preview_code,
    onboarding_steps: parseOnboardingSteps(studio.onboarding_steps),
    created_at: studio.created_at,
  };
}

export async function getStudioForProfessionalApp(slug: string): Promise<ProfessionalStudio | null> {
  const studio = await getStudioBySlug(slug);
  return studio ? studioToProfessional(studio) : null;
}

