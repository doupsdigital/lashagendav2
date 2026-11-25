import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { countClientAppointments, getClientProfile } from '@/lib/clients/client-service';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { ClientProfileClient } from '@/components/clients/ClientProfileClient';

interface ClientePageProps {
  params: Promise<{ slug: string; id: string }>;
}

/** Perfil da cliente (F7.2): dados, editar e excluir. */
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
  const appointments = await countClientAppointments(studio.id, client.id);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  return (
    <>
      <PageTitleBar title="Clientes" icon={<Users className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <ClientProfileClient slug={slug} client={client} appointments={appointments} today={today} />
      </main>
    </>
  );
}
