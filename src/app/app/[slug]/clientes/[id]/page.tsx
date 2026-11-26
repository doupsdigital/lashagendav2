import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getClientHistory, getClientProfile } from '@/lib/clients/client-service';
import { splitHistory, summarizeHistory } from '@/lib/clients/client-history';
import { getManualBookingServices } from '@/lib/scheduling/agenda-service';
import { getClientTechnical } from '@/lib/clients/client-sheet-service';
import { countTechnicalFilled, technicalSummary } from '@/lib/clients/client-technical';
import { ClientHistoryList, ClientHistorySummaryCard } from '@/components/clients/ClientHistory';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { ClientProfileClient } from '@/components/clients/ClientProfileClient';

interface ClientePageProps {
  params: Promise<{ slug: string; id: string }>;
}

/** Perfil da cliente: dados, editar e excluir (F7.2); resumo e histórico (F7.3);
 *  registrar atendimento feito fora do app (F7.4). */
export default async function ClientePage({ params }: ClientePageProps) {
  const { slug, id } = await params;
  // Sem sessão não lê nada (o layout só esconde — ver clientes/page.tsx).
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const studio = await getStudioForProfessionalApp(slug);
  if (!studio) notFound();
  if (studio.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const client = await getClientProfile(studio.id, id);
  // Link antigo de cliente excluída (ou de outro estúdio): volta para a lista.
  if (!client) redirect(`/app/${slug}/clientes`);
  const [history, services, technical] = await Promise.all([
    getClientHistory(studio.id, client.id),
    getManualBookingServices(studio.id),
    getClientTechnical(studio.id, client.id),
  ]);
  const sheet = technical?.technical || {};
  const now = new Date();
  const { upcoming, past } = splitHistory(history, now);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  return (
    <>
      <PageTitleBar title="Clientes" icon={<Users className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <ClientProfileClient
          slug={slug}
          client={client}
          appointments={history.length}
          today={today}
          services={services}
          sheet={{ summary: technicalSummary(sheet), filled: countTechnicalFilled(sheet) }}
          summary={<ClientHistorySummaryCard summary={summarizeHistory(history, now)} />}
          history={<ClientHistoryList slug={slug} clientId={client.id} upcoming={upcoming} past={past} nowIso={now.toISOString()} />}
        />
      </main>
    </>
  );
}
