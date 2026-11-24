import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CatalogOrderData } from '@/types/catalog';
import {
  buildServicesPayload,
  buildStudioUpdateFromCatalog,
  buildVariationRows,
  isValidServiceId,
  normalizeSlug,
} from '@/lib/studio-service';
import { isPreviewStudio } from '@/lib/studio-access';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, edit_token, catalogData } = body as {
      slug: string;
      edit_token: string;
      catalogData: CatalogOrderData;
    };

    if (!slug || !edit_token) {
      return NextResponse.json(
        { success: false, message: 'Slug e edit_token são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Conferir slug + edit_token
    const { data: studio, error: fetchError } = await supabaseAdmin
      .from('studios')
      .select('id, edit_token, plan_status')
      .eq('slug', normalizeSlug(slug))
      .maybeSingle();

    if (fetchError || !studio) {
      return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });
    }

    if (studio.edit_token !== edit_token) {
      return NextResponse.json(
        { success: false, message: 'Token de edição inválido ou não autorizado.' },
        { status: 403 }
      );
    }

    // Prévia gratuita nunca é editável — só depois do pagamento aprovado.
    if (isPreviewStudio(studio)) {
      return NextResponse.json({ success: false, message: 'Ative seu catálogo para poder editar.' }, { status: 403 });
    }

    const studioId = studio.id as string;

    // 2. Dados do estúdio
    const { error: updateError } = await supabaseAdmin
      .from('studios')
      .update(buildStudioUpdateFromCatalog(catalogData))
      .eq('id', studioId);

    if (updateError) {
      console.error('[API Catalog Save] Erro ao atualizar studios:', updateError);
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar dados gerais do catálogo.' },
        { status: 500 }
      );
    }

    // 3. Serviços — upsert em vez de apagar-e-reinserir: quem já tem id de
    // banco é atualizado no lugar (id estável, agendamentos apontam para ele);
    // id provisório do navegador vira INSERT; só o que saiu do editor é apagado.
    // Devolve o mapa id-provisório → id-real para o editor trocar na hora
    // (sem isso, salvar duas vezes o mesmo serviço novo duplicava a linha).
    const idMap: Record<string, string> = {};
    // Mesmo papel do `idMap`, para as variações novas.
    const variationIdMap: Record<string, string> = {};

    if (Array.isArray(catalogData.procedures)) {
      const { data: existingRows, error: existingErr } = await supabaseAdmin
        .from('services')
        .select('id')
        .eq('studio_id', studioId);

      if (existingErr) {
        console.error('[API Catalog Save] Erro ao listar serviços existentes:', existingErr);
        return NextResponse.json({ success: false, message: 'Erro ao salvar os serviços do catálogo.' }, { status: 500 });
      }

      // Só ids que JÁ são deste estúdio entram no upsert. Um UUID de outro
      // estúdio vindo no payload viraria "roubo" do serviço alheio — trata
      // como serviço novo.
      const ownIds = new Set((existingRows || []).map((r) => r.id as string));
      const procedures = catalogData.procedures.map((p) =>
        isValidServiceId(p.id) && !ownIds.has(p.id) ? { ...p, id: `novo-${p.id}` } : p
      );

      const rows = buildServicesPayload(procedures, studioId);
      const rowsWithId = rows.filter((r) => isValidServiceId(r.id as string | undefined));
      const rowsWithoutId = rows.filter((r) => !isValidServiceId(r.id as string | undefined));
      // Mesma ordem relativa de `rowsWithoutId`, para casar cada id
      // provisório com o id real devolvido pelo INSERT.
      const provisionalIds = catalogData.procedures
        .filter((p) => !(isValidServiceId(p.id) && ownIds.has(p.id)))
        .map((p) => p.id);
      const keepIds = new Set<string>(rowsWithId.map((r) => r.id as string));

      if (rowsWithId.length > 0) {
        const { error: upsertErr } = await supabaseAdmin.from('services').upsert(rowsWithId, { onConflict: 'id' });
        if (upsertErr) {
          console.error('[API Catalog Save] Erro ao atualizar serviços (upsert):', upsertErr);
          return NextResponse.json({ success: false, message: 'Erro ao salvar os serviços do catálogo.' }, { status: 500 });
        }
      }

      if (rowsWithoutId.length > 0) {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('services')
          .insert(rowsWithoutId)
          .select('id, position')
          .order('position', { ascending: true });

        if (insertErr) {
          console.error('[API Catalog Save] Erro ao inserir serviços novos:', insertErr);
          return NextResponse.json({ success: false, message: 'Erro ao salvar os serviços do catálogo.' }, { status: 500 });
        }
        (inserted || []).forEach((r, i) => {
          const realId = r.id as string;
          keepIds.add(realId);
          const provisionalId = provisionalIds[i];
          if (provisionalId) idMap[provisionalId] = realId;
        });
      }

      const toDelete = [...ownIds].filter((id) => !keepIds.has(id));
      if (toDelete.length > 0) {
        // Agendamentos guardam cópia do nome/duração/preço (appointment_items),
        // então apagar o serviço não altera o histórico.
        const { error: deleteErr } = await supabaseAdmin.from('services').delete().in('id', toDelete);
        if (deleteErr) console.error('[API Catalog Save] Erro ao apagar serviços removidos:', deleteErr);
      }

      // 4. Variações (F3.3) — só dos serviços que vieram com a lista
      // `variations` (ausente = não mexe). Mesma ideia do upsert dos
      // serviços: id estável para as que já existem, apaga as que saíram.
      const withVariations = catalogData.procedures
        .map((p) => ({ p, serviceId: ownIds.has(p.id) ? p.id : idMap[p.id] }))
        .filter((x): x is { p: (typeof x)['p']; serviceId: string } => Boolean(x.serviceId) && Array.isArray(x.p.variations));

      if (withVariations.length > 0) {
        const serviceIds = withVariations.map((x) => x.serviceId);
        const { data: existingVars, error: varsErr } = await supabaseAdmin
          .from('service_variations')
          .select('id, service_id')
          .in('service_id', serviceIds);

        if (varsErr) {
          console.error('[API Catalog Save] Erro ao listar variações:', varsErr);
          return NextResponse.json({ success: false, message: 'Erro ao salvar as opções dos serviços.' }, { status: 500 });
        }

        const varRows = withVariations.flatMap(({ p, serviceId }) => {
          const own = new Set((existingVars || []).filter((v) => v.service_id === serviceId).map((v) => v.id as string));
          return buildVariationRows(p.variations, serviceId, own, variationIdMap);
        });
        const keepVarIds = new Set(varRows.map((r) => r.id));

        if (varRows.length > 0) {
          const { error: varUpsertErr } = await supabaseAdmin.from('service_variations').upsert(varRows, { onConflict: 'id' });
          if (varUpsertErr) {
            console.error('[API Catalog Save] Erro ao gravar variações:', varUpsertErr);
            return NextResponse.json({ success: false, message: 'Erro ao salvar as opções dos serviços.' }, { status: 500 });
          }
        }

        const varsToDelete = (existingVars || []).map((v) => v.id as string).filter((id) => !keepVarIds.has(id));
        if (varsToDelete.length > 0) {
          // `appointment_items.variation_id` vira NULL; o item guarda cópia
          // do nome/duração/preço, então o histórico não muda.
          const { error: varDeleteErr } = await supabaseAdmin.from('service_variations').delete().in('id', varsToDelete);
          if (varDeleteErr) console.error('[API Catalog Save] Erro ao apagar variações removidas:', varDeleteErr);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Catálogo publicado com sucesso!', idMap, variationIdMap });
  } catch (error: unknown) {
    console.error('[API Catalog Save Exception]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno ao salvar catálogo.' },
      { status: 500 }
    );
  }
}
