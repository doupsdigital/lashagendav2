import { notFound, redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import { getOrderForProfessionalApp } from '@/lib/professional-app-service';
import { getBusinessHours, getScheduleBlocks } from '@/lib/scheduling/config-service';
import { ConfigAccordion } from '@/components/config/ConfigAccordion';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';

interface ConfigPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConfigPage({ params }: ConfigPageProps) {
  const { slug } = await params;
  const order = await getOrderForProfessionalApp(slug);

  if (!order) notFound();
  // Produto "Catálogo apenas" (2026-10-27): Config fica inacessível mesmo por
  // URL direta, não só escondida da navegação (ver BottomNav/layout.tsx).
  if (order.show_full_app === false) redirect(`/app/${slug}/inicio`);

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
          bookingEnabled={order.booking_enabled}
          agendaPaused={order.agenda_paused}
          authUserId={order.auth_user_id}
        />
      </main>
    </>
  );
}
