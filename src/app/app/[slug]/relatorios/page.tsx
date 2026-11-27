import React from 'react';
import { notFound } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioReport } from '@/lib/dashboard/report-service';
import { resolvePeriod } from '@/lib/dashboard/report';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { ReportView } from '@/components/reports/ReportView';

interface RelatoriosPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}

/** Relatórios por período (F9.2). O período vai na URL (`?periodo=`, e
 *  `de`/`ate` no personalizado) — só datas, nada sobre as clientes. */
export default async function RelatoriosPage({ params, searchParams }: RelatoriosPageProps) {
  const { slug } = await params;
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const order = await getStudioForProfessionalApp(slug);
  if (!order) notFound();

  const { periodo, de, ate } = await searchParams;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  // Personalizado sem as datas: mostra o formulário, com o mês até lá.
  const period = resolvePeriod(periodo, today, de, ate);
  const choosingCustom = periodo === 'personalizado' && !de && !ate;
  const report = order.has_paid_access ? await getStudioReport(order.id, period) : null;

  return (
    <>
      <PageTitleBar title="Relatórios" icon={<BarChart3 className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
        {report ? (
          <ReportView
            slug={slug}
            period={period}
            selected={periodo === 'personalizado' ? 'personalizado' : period.id}
            problem={choosingCustom ? null : period.problem}
            customFrom={typeof de === 'string' ? de : ''}
            customTo={typeof ate === 'string' ? ate : ''}
            today={today}
            report={report}
          />
        ) : (
          <p className="text-[15px] text-ink-soft">Os relatórios fazem parte do app completo.</p>
        )}
      </main>
    </>
  );
}
