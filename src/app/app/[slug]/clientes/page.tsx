import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getClientList } from '@/lib/clients/client-service';
import { getStudioSheetStatus } from '@/lib/clients/client-sheet-service';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { ClientsClient } from '@/components/clients/ClientsClient';

interface ClientesPageProps {
  params: Promise<{ slug: string }>;
}

/** Aba Clientes (F7.1): todas as clientes do estúdio, com busca, WhatsApp,
 *  atendimentos feitos e o último; cadastro manual de cliente nova. Filtro
 *  pela ficha: sem ficha / com pontos de atenção (F8.5). */
export default async function ClientesPage({ params }: ClientesPageProps) {
  const { slug } = await params;
  // O layout mostra "link inválido" sem sessão, mas a página roda mesmo
  // assim e iria no HTML — sem sessão não lê nenhuma cliente.
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const studio = await getStudioForProfessionalApp(slug);
  if (!studio) notFound();
  // Prévia não tem as abas (ver layout.tsx).
  if (studio.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const [clients, sheetStatus] = await Promise.all([getClientList(studio.id), getStudioSheetStatus(studio.id)]);

  return (
    <>
      <PageTitleBar title="Clientes" icon={<Users className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <ClientsClient slug={slug} clients={clients} sheetStatus={sheetStatus} />
      </main>
    </>
  );
}
