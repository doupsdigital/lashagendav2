import React from 'react';
import { notFound } from 'next/navigation';
import { getStudioForProfessionalApp } from '@/lib/studio-service';
import { isProfessionalRequestAuthorized } from '@/lib/professional-session';
import { getInicioNumbers } from '@/lib/dashboard/inicio-service';
import { formatBRL } from '@/lib/service-format';
import { PendingAttentionCard, QuickActions, TodayAgendaCard } from '@/components/inicio/InicioCards';
import { getAppointmentsForDay, getPendingAppointments, getRecentClientActivity } from '@/lib/scheduling/agenda-service';
import { ClientActivityCard } from '@/components/app-shell/ClientActivityCard';
import { getBusinessHours } from '@/lib/scheduling/config-service';
import { GradientHeader } from '@/components/app-shell/GradientHeader';
import { StatCard } from '@/components/app-shell/StatCard';
import { ViewCatalogCard } from '@/components/app-shell/ViewCatalogCard';
import { EditCatalogCard } from '@/components/app-shell/EditCatalogCard';
import { ShareLinkButton } from '@/components/app-shell/ShareLinkButton';
import { PageTitleBar } from '@/components/app-shell/PageTitleBar';
import { OnboardingCardStack } from '@/components/app-shell/OnboardingCardStack';
import { InicioTour } from '@/components/tour/InicioTour';
import { countSelfServeStepsDone, SELF_SERVE_STEP_ORDER } from '@/lib/self-serve-onboarding';
import { getSelfServeFacts } from '@/lib/self-serve-progress';
import Link from 'next/link';
import { CaktoPlanCard } from '@/components/billing/CaktoPlanCard';
import { CalendarDays, Share2, Home, ListChecks, ChevronRight, Wallet, TrendingUp, UserPlus, BarChart3 } from 'lucide-react';

interface InicioPageProps {
  params: Promise<{ slug: string }>;
}

/** Saudação baseada na hora em America/Sao_Paulo (não o fuso do servidor). */
function getGreeting(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  return hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export default async function InicioPage({ params }: InicioPageProps) {
  const { slug } = await params;
  // A tela agora lista nomes de clientes (agenda de hoje, pendentes): sem
  // sessão não lê nada (mesma regra da Agenda e de Clientes).
  if (!(await isProfessionalRequestAuthorized(slug))) return null;
  const order = await getStudioForProfessionalApp(slug);

  if (!order) notFound();

  const hasPaidAccess = order.has_paid_access;
  // Agendamento de fato funcionando para a cliente final (`isBookingLive`).
  const schedulingLive = order.booking_live;
  const todayStr = todayInSaoPaulo();
  const isSelfServe = order.plan_status !== 'preview';
  const [todayAppointments, pendingAppointments, businessHours, clientActivity, numbers, selfServeFacts] = await Promise.all([
    getAppointmentsForDay(order.id, todayStr),
    getPendingAppointments(order.id),
    // Só o checklist de "próximos passos" usa isso (item de horários).
    hasPaidAccess ? getBusinessHours(order.id) : Promise.resolve([]),
    // Novidades das clientes (F5.6) — também com a agenda pausada, para ela
    // ver o que entrou antes de pausar.
    hasPaidAccess ? getRecentClientActivity(order.id) : Promise.resolve([]),
    // Números do painel (F9.1): faturado hoje/mês e clientes novas no mês.
    hasPaidAccess ? getInicioNumbers(order.id, todayStr) : Promise.resolve(null),
    // Checklist "Primeiros passos" (F11.5): o que já foi feito, pelo banco.
    isSelfServe ? getSelfServeFacts(order) : Promise.resolve(null),
  ]);
  const hoursDone = businessHours.length > 0;

  // Enquanto o checklist "Primeiros passos" (pós-compra) não termina, um
  // card no topo leva ela de volta pra lá.
  const selfServeTotal = SELF_SERVE_STEP_ORDER.length;
  const selfServeDone = selfServeFacts ? countSelfServeStepsDone(order.onboarding_steps, selfServeFacts) : 0;
  const showSelfServeContinue = isSelfServe && selfServeDone < selfServeTotal;

  // Card "Meu plano" (assinatura Cakto; não aparece para liberação manual do
  // admin): no topo quando precisa de ação (fora do ar, renovação recusada,
  // cancelada), senão no fim da tela.
  const isCakto = order.plan_status !== 'preview' && !order.manual_plan;
  const caktoNeedsAttention =
    isCakto && (order.plan_status !== 'active' || !order.paid_until || new Date(order.paid_until).getTime() < Date.now());
  // `#plano`: destino do aviso "acesso vencido" das outras telas (F11.7).
  const caktoPlanCard = isCakto ? (
    <div id="plano" className="scroll-mt-20">
      <CaktoPlanCard
        plan={order.cakto_plan}
        status={order.plan_status}
        paidUntil={order.paid_until}
        checkoutRef={order.cakto_checkout_ref}
      />
    </div>
  ) : null;

  const greeting = getGreeting();
  const firstName = order.client_name.split(' ')[0];

  return (
    <>
      <PageTitleBar title="Início" icon={<Home className="w-5 h-5 text-ink-soft" />} slug={slug} />
      <main className="max-w-md mx-auto px-5 pt-6 pb-6 flex flex-col gap-4">
      {/* pt-5 pb-5 (em vez do p-6 padrão do GradientHeader, que também é
       *  usado no cabeçalho da Agenda): cartão mais baixo, pedido de 2026-09-23. */}
      <GradientHeader tone="light" className="pt-5 pb-5">
        <h1 className="font-serif-pro font-bold text-3xl">
          {greeting}, {firstName}!
        </h1>
        <p className="text-[15px] text-rose-800/70 mt-1.5 italic">Bem-vinda ao seu Studio! ✨</p>
      </GradientHeader>

      {caktoNeedsAttention && caktoPlanCard}

      {showSelfServeContinue && (
        <Link
          href={`/app/${slug}/primeiros-passos`}
          className="flex items-center gap-4 rounded-2xl p-4 bg-surface border-2 border-rose-300 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <ListChecks className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] text-ink leading-tight">Continue de onde parou</p>
            <p className="text-sm text-ink-soft mt-0.5">
              Primeiros passos: {selfServeDone} de {selfServeTotal} feitos
            </p>
            <div className="h-1.5 rounded-full bg-linen mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-rose-600" style={{ width: `${(selfServeDone / selfServeTotal) * 100}%` }} />
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" />
        </Link>
      )}

      {/* Painel (F9.1): atenção primeiro, números, agenda de hoje e ações
       *  rápidas. Só com o app completo (a Agenda fica travada sem ele). */}
      {hasPaidAccess && (
        <>
          <PendingAttentionCard slug={slug} pending={pendingAppointments} todayStr={todayStr} />

          {numbers && (
            <div className="grid grid-cols-2 gap-3" data-tour="stat-today">
              <StatCard icon={CalendarDays} label="Agendamentos hoje" value={todayAppointments.length} href={`/app/${slug}/agenda`} />
              <StatCard icon={Wallet} label="Faturado hoje" value={formatBRL(numbers.revenueToday)} />
              <StatCard icon={TrendingUp} label="Faturado no mês" value={formatBRL(numbers.revenueMonth)} />
              <StatCard icon={UserPlus} label="Clientes novas no mês" value={numbers.newClientsMonth} href={`/app/${slug}/clientes`} />
            </div>
          )}

          {/* Relatórios por período (F9.2). */}
          <Link
            href={`/app/${slug}/relatorios`}
            className="flex items-center gap-3 rounded-2xl p-4 bg-surface border border-linen shadow-sm active:scale-[0.98] transition-transform -mt-1"
          >
            <BarChart3 className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1 font-bold text-[15px] text-ink">Ver relatórios</span>
            <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" />
          </Link>

          <TodayAgendaCard slug={slug} appointments={todayAppointments} />

          <QuickActions slug={slug} />
        </>
      )}

      <ClientActivityCard slug={slug} activity={clientActivity} />

      <ViewCatalogCard slug={order.slug} />

      <EditCatalogCard slug={order.slug} />

      <div className="rounded-2xl p-6 bg-gradient-to-br from-rose-200 to-rose-100 border border-rose-200/60 relative overflow-hidden text-center">
        <Share2 className="absolute -top-3 -right-3 w-24 h-24 text-rose-300/50 rotate-12 pointer-events-none select-none" strokeWidth={1.25} />
        <div className="relative z-10">
          <h2 className="font-serif-pro font-bold text-xl text-rose-800 mb-1.5">Compartilhe seu Catálogo</h2>
          <p className="text-[15px] text-rose-800/70 mb-4 max-w-xs mx-auto">
            {schedulingLive
              ? 'Envie esse link pra suas clientes verem seus serviços e preços, e agendarem sozinhas.'
              : 'Coloque esse link na Bio do seu Instagram ou compartilhe pelo WhatsApp pra suas clientes verem seus serviços e preços.'}
          </p>
          <ShareLinkButton slug={order.slug} />
        </div>
      </div>

      {isCakto && !caktoNeedsAttention && caktoPlanCard}

      <OnboardingCardStack
        slug={slug}
        hasPaidAccess={hasPaidAccess}
        hasAccount={Boolean(order.auth_user_id)}
        hoursDone={hoursDone}
        selfServePending={showSelfServeContinue}
      />

      <InicioTour
        slug={slug}
        hasPaidAccess={hasPaidAccess}
        hasAccount={Boolean(order.auth_user_id)}
        hoursDone={hoursDone}
        selfServePending={showSelfServeContinue}
        hasPending={pendingAppointments.length > 0}
      />
      </main>
    </>
  );
}
