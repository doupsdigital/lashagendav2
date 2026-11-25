import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, normalizeSlug } from '@/lib/studio-service';
import { searchStudioClients } from '@/lib/scheduling/agenda-service';

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
