import { notFound, redirect } from 'next/navigation';
import { ListChecks } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getSelfServeFacts } from '@/lib/self-serve-progress';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { SelfServeChecklist } from '@/components/app-shell/SelfServeChecklist';

interface PrimeirosPassosPageProps {
  params: Promise<{ slug: string }>;
}

/** Checklist guiado pós-compra (Cakto). É a primeira tela depois do pagamento
 *  (`/ativando` leva pra cá). Mostra o WhatsApp do estúdio: sem sessão não lê
 *  nada (mesma regra das outras telas do app). */
export default async function PrimeirosPassosPage({ params }: PrimeirosPassosPageProps) {
  const { slug } = await params;
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const order = await getStudioForProfessionalApp(slug);

  if (!order) notFound();
  // Ainda é prévia / nunca pagou: não tem o que configurar.
  if (order.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const facts = await getSelfServeFacts(order);

  return (
    <>
      <PageTitleBar title="Primeiros passos" icon={<ListChecks className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        <SelfServeChecklist
          slug={order.slug}
          name={order.client_name || order.studio_name || ''}
          whatsapp={order.whatsapp_number}
          facts={facts}
          initialSteps={order.onboarding_steps}
        />
      </main>
    </>
  );
}
