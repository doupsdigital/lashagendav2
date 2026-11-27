import 'server-only';
import { supabaseAdmin } from '../supabase-admin';
import { RESERVED_SLUGS } from '../reserved-slugs';
import { finalSlug, slugProblem } from './slug-rules';

export type ChangeSlugResult = { ok: true; slug: string } | { ok: false; message: string; status: number };

/** Troca o endereço do link (F10.3). O link antigo para de funcionar (não
 *  existe tabela de endereços antigos — decisão da F10.3). */
export async function changeStudioSlug(studioId: string, currentSlug: string, raw: unknown): Promise<ChangeSlugResult> {
  const slug = finalSlug(typeof raw === 'string' ? raw : '');
  const problem = slugProblem(slug);
  if (problem) return { ok: false, message: problem, status: 400 };
  if (slug === currentSlug) return { ok: false, message: 'Esse já é o seu endereço.', status: 400 };
  if (RESERVED_SLUGS.includes(slug)) return { ok: false, message: 'Esse endereço não está disponível. Tente outro.', status: 409 };

  const { data: taken } = await supabaseAdmin.from('studios').select('id').eq('slug', slug).maybeSingle();
  if (taken) return { ok: false, message: 'Esse endereço já está em uso. Tente outro.', status: 409 };

  const { error } = await supabaseAdmin.from('studios').update({ slug }).eq('id', studioId).eq('slug', currentSlug);
  if (error) {
    // 23505: outra pessoa pegou o mesmo endereço no mesmo instante.
    if (error.code === '23505') return { ok: false, message: 'Esse endereço já está em uso. Tente outro.', status: 409 };
    console.error('[slug-service] troca:', error.message);
    return { ok: false, message: 'Não foi possível trocar. Tente de novo.', status: 500 };
  }
  return { ok: true, slug };
}
