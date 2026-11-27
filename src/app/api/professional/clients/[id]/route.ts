import { NextResponse } from 'next/server';
import { lapsedResponse } from '@/lib/access-guard';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { deleteClient, updateClientProfile } from '@/lib/clients/client-service';
import { cleanClientProfile, deleteBlockedMessage } from '@/lib/clients/client-profile';
import { INVALID_WHATSAPP_MESSAGE, isValidClientWhatsapp, normalizeClientWhatsapp } from '@/lib/scheduling/client-phone';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Sessão da profissional para o `slug` e o estúdio dele. A cliente é sempre
 *  procurada DENTRO desse estúdio — uma sessão não alcança cliente de outro. */
async function authorize(slugRaw: unknown) {
  const slug = normalizeSlug(typeof slugRaw === 'string' ? slugRaw : '');
  if (!slug) return { error: NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 }) };
  if (!(await isProfessionalRequestAuthorized(slug))) {
    return { error: NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 }) };
  }
  const studio = await getStudioBySlug(slug);
  if (!studio) return { error: NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 }) };
  return { studio };
}

const notFound = () => NextResponse.json({ success: false, message: 'Cliente não encontrada.' }, { status: 404 });

/** PATCH /api/professional/clients/[id] — edita o perfil (F7.2).
 *  Corpo: { slug, name, whatsapp?, email?, birth_date?, notes? }. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-update:${ip}`, 30, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const auth = await authorize(body.slug);
    if ('error' in auth) return auth.error;
    const lapsed = lapsedResponse(auth.studio);
    if (lapsed) return lapsed;

    const clean = cleanClientProfile(body, todayInSaoPaulo());
    if (!clean.ok) return NextResponse.json({ success: false, message: clean.message }, { status: 400 });

    const rawWhatsapp = typeof body.whatsapp === 'string' ? body.whatsapp : '';
    const whatsapp = rawWhatsapp.replace(/\D/g, '') ? normalizeClientWhatsapp(rawWhatsapp) : '';
    if (whatsapp && !isValidClientWhatsapp(whatsapp)) {
      return NextResponse.json({ success: false, message: INVALID_WHATSAPP_MESSAGE }, { status: 400 });
    }

    const result = await updateClientProfile(auth.studio.id, id, { ...clean.data, whatsapp });
    if (result.ok) return NextResponse.json({ success: true, client: result.client });
    if (result.reason === 'duplicate') {
      return NextResponse.json(
        { success: false, reason: 'duplicate', duplicate: result.duplicate, message: `Esse WhatsApp já é de ${result.duplicate.name}.` },
        { status: 409 }
      );
    }
    if (result.reason === 'not_found') return notFound();
    return NextResponse.json({ success: false, message: 'Não foi possível salvar. Tente de novo.' }, { status: 500 });
  } catch (error) {
    console.error('[API Professional Client Update]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}

/** DELETE /api/professional/clients/[id]?slug= — exclui a cliente (F7.2),
 *  só se ela não tem nenhum agendamento; com histórico devolve 409. */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-delete:${ip}`, 20, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    const { id } = await params;
    const auth = await authorize(new URL(request.url).searchParams.get('slug'));
    if ('error' in auth) return auth.error;

    const result = await deleteClient(auth.studio.id, id);
    if (result.ok) return NextResponse.json({ success: true });
    if (result.reason === 'has_history') {
      return NextResponse.json(
        { success: false, reason: 'has_history', appointments: result.appointments, message: deleteBlockedMessage(result.appointments) },
        { status: 409 }
      );
    }
    if (result.reason === 'not_found') return notFound();
    return NextResponse.json({ success: false, message: 'Não foi possível excluir. Tente de novo.' }, { status: 500 });
  } catch (error) {
    console.error('[API Professional Client Delete]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
