import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CatalogOrderData } from '@/types/catalog';
import { buildServicesPayload, buildStudioUpdateFromCatalog, isValidServiceId, normalizeSlug } from '@/lib/studio-service';
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
    }

    return NextResponse.json({ success: true, message: 'Catálogo publicado com sucesso!', idMap });
  } catch (error: unknown) {
    console.error('[API Catalog Save Exception]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno ao salvar catálogo.' },
      { status: 500 }
    );
  }
}
