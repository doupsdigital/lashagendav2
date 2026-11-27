import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getClientProfile } from '@/lib/clients/client-service';
import { getClientSheet } from '@/lib/clients/client-sheet-service';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { ClientSheetForm } from '@/components/clients/ClientSheetForm';

interface FichaPageProps {
  params: Promise<{ slug: string; id: string }>;
}

/** Ficha da cliente — abas "Ficha técnica" (F8.1) e "Saúde e cuidados"
 *  (F8.2). Só dentro do app, sem pixel (o pixel nunca roda em `/app`). */
export default async function FichaPage({ params }: FichaPageProps) {
  const { slug, id } = await params;
  // Sem sessão não lê nada (o layout só esconde — ver clientes/page.tsx).
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const studio = await getStudioForProfessionalApp(slug);
  if (!studio) notFound();
  if (studio.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const [client, record] = await Promise.all([getClientProfile(studio.id, id), getClientSheet(studio.id, id)]);
  if (!client || !record) redirect(`/app/${slug}/clientes`);

  return (
    <>
      <PageTitleBar title="Clientes" icon={<Users className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <ClientSheetForm
          slug={slug}
          clientId={client.id}
          clientName={client.name}
          technical={record.technical}
          health={record.health}
          consentAt={record.consent_at}
          updatedAt={record.updated_at}
        />
      </main>
    </>
  );
}
