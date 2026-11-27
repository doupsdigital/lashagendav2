import { NextResponse } from 'next/server';
import { lapsedResponseForSlug } from '@/lib/access-guard';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { searchStudioClients } from '@/lib/scheduling/agenda-service';
import { createManualClient } from '@/lib/clients/client-service';
import { cleanClientName } from '@/lib/clients/client-list';
import { INVALID_WHATSAPP_MESSAGE, isValidClientWhatsapp, normalizeClientWhatsapp } from '@/lib/scheduling/client-phone';

/** GET /api/professional/clients?slug=&q=
 *  Busca de clientes do estúdio por nome ou WhatsApp para o agendamento
 *  manual (F6.4). Só com sessão da profissional; no máximo 8 resultados. */
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-search:${ip}`, 60, 60))) {
      return NextResponse.json({ success: false, message: 'Muitas buscas. Aguarde um instante.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const slug = normalizeSlug(searchParams.get('slug') || '');
    const q = (searchParams.get('q') || '').slice(0, 60);
    if (!slug) return NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 });

    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const studio = await getStudioBySlug(slug);
    if (!studio) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const clients = await searchStudioClients(studio.id, q);
    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('[API Professional Clients Search]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}

/** POST /api/professional/clients — cadastro manual de cliente (F7.1).
 *  Corpo: { slug, name, whatsapp? }. WhatsApp é opcional, mas se vier tem de
 *  ser válido; se já for de outra cliente, devolve 409 com quem é. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`professional-client-create:${ip}`, 20, 5 * 60))) {
      return NextResponse.json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as { slug?: unknown; name?: unknown; whatsapp?: unknown };
    const slug = normalizeSlug(typeof body.slug === 'string' ? body.slug : '');
    if (!slug) return NextResponse.json({ success: false, message: 'Catálogo não informado.' }, { status: 400 });

    if (!(await isProfessionalRequestAuthorized(slug))) {
      return NextResponse.json({ success: false, message: 'Sessão inválida ou expirada.' }, { status: 401 });
    }
    const lapsed = await lapsedResponseForSlug(slug);
    if (lapsed) return lapsed;

    const name = cleanClientName(body.name);
    if (!name) return NextResponse.json({ success: false, message: 'Escreva o nome da cliente.' }, { status: 400 });

    const rawWhatsapp = typeof body.whatsapp === 'string' ? body.whatsapp : '';
    if (rawWhatsapp.replace(/\D/g, '') && !isValidClientWhatsapp(normalizeClientWhatsapp(rawWhatsapp))) {
      return NextResponse.json({ success: false, message: INVALID_WHATSAPP_MESSAGE }, { status: 400 });
    }

    const studio = await getStudioBySlug(slug);
    if (!studio) return NextResponse.json({ success: false, message: 'Catálogo não encontrado.' }, { status: 404 });

    const result = await createManualClient(studio.id, name, rawWhatsapp);
    if (result.ok) return NextResponse.json({ success: true, client: { id: result.id, name } });
    if (result.duplicate) {
      return NextResponse.json(
        { success: false, reason: 'duplicate', duplicate: result.duplicate, message: `Esse WhatsApp já é de ${result.duplicate.name}.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: 'Não foi possível cadastrar. Tente de novo.' }, { status: 500 });
  } catch (error) {
    console.error('[API Professional Clients Create]:', error);
    return NextResponse.json({ success: false, message: 'Erro interno.' }, { status: 500 });
  }
}
