import { getClientAppointment } from '@/lib/scheduling/client-appointment-service';
import { buildIcsEvent, manageAppointmentPath } from '@/lib/scheduling/client-appointment';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/** GET /api/scheduling/appointment/[token]/ics?slug=X
 *  Arquivo "adicionar à agenda do celular" do agendamento (F5.4). */
export async function GET(request: Request, { params }: RouteParams) {
  const { token } = await params;
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const view = slug ? await getClientAppointment(slug, token) : null;
  if (!view || view.status === 'canceled') {
    return new Response('Agendamento não encontrado.', { status: 404 });
  }

  const services = view.items.map((i) => i.title).join(' + ');
  const ics = buildIcsEvent({
    uid: view.id,
    startsAt: new Date(view.startsAt),
    endsAt: new Date(view.endsAt),
    title: `${services} · ${view.studio.name}`,
    description: `Seu agendamento: ${url.origin}${manageAppointmentPath(view.studio.slug, view.token)}`,
    location: view.studio.address || undefined,
    url: `${url.origin}${manageAppointmentPath(view.studio.slug, view.token)}`,
  });

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="agendamento.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
