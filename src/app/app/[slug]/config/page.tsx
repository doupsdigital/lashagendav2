import { notFound, redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { getBusinessHours, getScheduleBlocks } from '@/lib/scheduling/config-service';
import { ConfigAccordion } from '@/components/config/ConfigAccordion';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';

interface ConfigPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConfigPage({ params }: ConfigPageProps) {
  const { slug } = await params;
  const order = await getStudioForProfessionalApp(slug);

  if (!order) notFound();
  // Prévia não tem Config (sem navegação entre abas, ver layout.tsx).
  if (order.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const [businessHours, scheduleBlocks] = await Promise.all([
    getBusinessHours(order.id),
    getScheduleBlocks(order.id),
  ]);

  return (
    <>
      <PageTitleBar title="Configurações" icon={<Settings className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-5">
        <ConfigAccordion
          slug={slug}
          businessHours={businessHours}
          scheduleBlocks={scheduleBlocks}
          bookingEnabled={order.has_paid_access}
          agendaPaused={order.agenda_paused}
          authUserId={order.auth_user_id}
        />
      </main>
    </>
  );
}
