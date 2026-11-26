import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfessionalSessionSlug, isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getStudioBySlug, getStudioForProfessionalApp } from '@/lib/studio-service';
import { PRODUCTION_DOMAIN } from '@/lib/public-url';
import { ServiceWorkerRegister } from '@/components/app-shell/ServiceWorkerRegister';
import { BottomNav } from '@/components/app-shell/BottomNav';
import { WelcomeOnboarding } from '@/components/app-shell/WelcomeOnboarding';
import { AppPostHogTracker } from '@/components/app-shell/AppPostHogTracker';

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/** Sobrescreve o manifest herdado da raiz (`start_url: '/'`, a landing page
 *  de vendas) pelo manifest dinâmico escopado desse catálogo — sem isso,
 *  instalar o PWA a partir de qualquer tela daqui abria a home de vendas
 *  depois de instalado, não o app da profissional.
 *
 *  Só devolve esse manifest quando a sessão é válida: sem isso, o Chrome
 *  considerava a tela de "link inválido" instalável e oferecia o app antes
 *  do login (achado testando no celular) — sem sessão, cai de volta no
 *  manifest raiz (inofensivo, é o mesmo já usado pela home de vendas).
 *
 *  Título/descrição/OG também precisam de override próprio aqui — sem isso,
 *  herdava o texto genérico da home de vendas ("StudioMenu — Catálogos
 *  Digitais de Alta Conversão..."), que é o que aparecia no preview do
 *  WhatsApp quando ela mandava o link do app pra cliente (bug real
 *  reportado, 2026-09-28). Não depende de sessão — o crawler do WhatsApp
 *  não necessariamente carrega o cookie ao seguir o redirect do link de
 *  login, e o nome do studio/foto de capa já são públicos mesmo (mesmos
 *  dados que aparecem no catálogo público dela). */
export async function generateMetadata({ params }: AppLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const [isAuthenticated, studio] = await Promise.all([
    isProfessionalRequestAuthorized(slug),
    getStudioBySlug(slug),
  ]);
  const displayName = studio ? studio.studio_name || studio.owner_name : '';

  const base: Metadata = studio
    ? {
        title: `${displayName} — LashAgenda`,
        description: 'Acesse seu catálogo digital e faça as edições que quiser, direto pelo celular.',
        openGraph: {
          title: `${displayName} — LashAgenda`,
          description: 'Acesse seu catálogo digital e faça as edições que quiser, direto pelo celular.',
          images: [
            {
              url: `https://${PRODUCTION_DOMAIN}/api/og/catalog/${slug}`,
              width: 1200,
              height: 630,
            },
          ],
          type: 'website',
        },
      }
    : {};

  if (!isAuthenticated) return base;
  return { ...base, manifest: `/app/${slug}/manifest.webmanifest` };
}

export default async function ProfessionalAppLayout({ children, params }: AppLayoutProps) {
  const { slug } = await params;
  const isAuthenticated = await isProfessionalRequestAuthorized(slug);

  if (!isAuthenticated) {
    // Endereço trocado na Config (F10.3): o app instalado continua abrindo o
    // endereço antigo. Se esse endereço não existe mais e a sessão deste
    // aparelho é de um estúdio que existe, leva para lá.
    const sessionSlug = await getProfessionalSessionSlug();
    if (sessionSlug && sessionSlug !== slug) {
      const [requested, current] = await Promise.all([getStudioBySlug(slug), getStudioBySlug(sessionSlug)]);
      if (!requested && current) redirect(`/app/${sessionSlug}/inicio`);
    }
    return (
      <main className="pro-app-shell min-h-screen flex items-center justify-center p-6 bg-cream text-ink text-center">
        <div className="max-w-sm w-full p-8 rounded-3xl bg-surface border border-linen shadow-sm">
          <h1 className="font-serif-pro text-2xl font-bold mb-2">Link inválido ou expirado</h1>
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Peça um novo link de acesso pra quem te enviou o catálogo.
          </p>
        </div>
      </main>
    );
  }

  // Prévia (ainda não pagou) não tem navegação entre abas — só o Início.
  // Mesma leitura repetida pelas páginas de cada aba, custo desprezível.
  const studio = await getStudioForProfessionalApp(slug);
  const showNav = Boolean(studio) && studio?.plan_status !== 'preview';

  return (
    <div className={`pro-app-shell min-h-screen bg-cream text-ink font-body-pro ${showNav ? 'pb-20' : ''}`}>
      <ServiceWorkerRegister />
      {studio && (
        <AppPostHogTracker
          slug={slug}
          planStatus={studio.plan_status}
          clientName={studio.client_name}
          studioName={studio.studio_name}
        />
      )}
      {/* Boas-vindas só para quem já tem o app completo (pagante). */}
      {studio?.has_paid_access && <WelcomeOnboarding slug={slug} />}
      {children}
      {showNav && <BottomNav slug={slug} />}
    </div>
  );
}
