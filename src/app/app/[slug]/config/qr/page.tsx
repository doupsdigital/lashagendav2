import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, QrCode } from 'lucide-react';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { PRODUCTION_DOMAIN } from '@/lib/public-url';
import { linkQrDataUrl } from '@/lib/studio/link-qr';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { PrintButton } from '@/components/config/PrintButton';

interface QrPageProps {
  params: Promise<{ slug: string }>;
}

/** Cartão do QR code para imprimir (F10.3): na impressão só o cartão sai. */
export default async function QrPrintPage({ params }: QrPageProps) {
  const { slug } = await params;
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const order = await getStudioForProfessionalApp(slug);
  if (!order) notFound();
  if (order.plan_status === 'preview') redirect(`/app/${slug}/inicio`);

  const display = `${slug}.${PRODUCTION_DOMAIN}`;
  const qr = await linkQrDataUrl(slug, 1024);
  const name = order.studio_name || order.client_name;

  return (
    <>
      <PageTitleBar title="QR code" icon={<QrCode className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4 print:p-0 print:max-w-none">
        <Link href={`/app/${slug}/config#link`} className="print:hidden flex items-center gap-1 text-[15px] font-semibold text-rose-600 -mb-1">
          <ChevronLeft className="w-4 h-4" /> Configurações
        </Link>

        <section className="rounded-3xl border-2 border-rose-200 bg-white p-8 flex flex-col items-center text-center gap-4 print:border-rose-300 print:mt-16 print:mx-auto print:w-[12cm]">
          <p className="font-serif-pro font-bold text-2xl text-ink">{name}</p>
          <p className="text-[15px] text-ink-soft">Aponte a câmera do celular para ver meus serviços e agendar</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code do link ${display}`} className="w-64 h-64" />
          <p className="font-bold text-[17px] text-rose-800 break-all">{display}</p>
        </section>

        <div className="print:hidden">
          <PrintButton />
        </div>
      </main>
    </>
  );
}
