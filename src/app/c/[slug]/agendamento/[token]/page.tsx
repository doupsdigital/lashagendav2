import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, MapPin, MessageCircle } from 'lucide-react';
import { getClientAppointment } from '@/lib/scheduling/client-appointment-service';
import { durationToLabel, formatBRL, PRICE_ON_REQUEST_LABEL } from '@/lib/service-format';
import { ClientCancelButton } from '@/components/catalog/ClientCancelButton';

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

// Link pessoal da cliente: nunca indexado, nunca em cache.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Seu agendamento',
  robots: { index: false, follow: false },
};

const TZ = 'America/Sao_Paulo';

const STATUS_LABEL = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
} as const;

const THEMES = {
  rose: {
    page: 'bg-[#fbeef2] text-[#24141a]',
    card: 'bg-white border border-[#f0d3dc]',
    muted: 'text-[#6b4a56]',
    label: 'text-[#9c4a65]',
    divider: 'border-[#f0d3dc]',
    primary: 'h-12 w-full rounded-xl bg-[#a93259] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2',
    secondary:
      'h-12 w-full rounded-xl border border-[#e7b9c7] bg-white text-[#a93259] text-[15px] font-bold inline-flex items-center justify-center gap-2',
    danger: 'h-12 w-full rounded-xl bg-[#b4233c] text-white text-[15px] font-bold disabled:opacity-60',
    link: 'text-[#a93259]',
  },
  luxury: {
    page: 'bg-[#0a0807] text-[#f3efe9]',
    card: 'bg-[#16110e] border border-[#2c231c]',
    muted: 'text-[#b9ab9c]',
    label: 'text-[#c9a389]',
    divider: 'border-[#2c231c]',
    primary: 'h-12 w-full rounded-xl bg-[#c9a389] text-[#1a120c] text-[15px] font-bold inline-flex items-center justify-center gap-2',
    secondary:
      'h-12 w-full rounded-xl border border-[#4a3a2e] bg-transparent text-[#e3c9b4] text-[15px] font-bold inline-flex items-center justify-center gap-2',
    danger: 'h-12 w-full rounded-xl bg-[#9b2c3c] text-white text-[15px] font-bold disabled:opacity-60',
    link: 'text-[#c9a389]',
  },
} as const;

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  canceled: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-sky-100 text-sky-800',
  no_show: 'bg-neutral-200 text-neutral-700',
} as const;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function ClientAppointmentPage({ params }: PageProps) {
  const { slug, token } = await params;
  const view = await getClientAppointment(slug, token);

  if (!view) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#fbeef2] text-[#24141a] text-center">
        <div className="max-w-sm w-full rounded-3xl bg-white border border-[#f0d3dc] p-8">
          <h1 className="font-serif text-2xl font-bold mb-2">Agendamento não encontrado</h1>
          <p className="text-[15px] text-[#6b4a56]">Confira se o link está completo. Se precisar, fale com a profissional pelo WhatsApp.</p>
        </div>
      </main>
    );
  }

  const t = THEMES[view.studio.themeVariant];
  const startsAt = new Date(view.startsAt);
  const endsAt = new Date(view.endsAt);
  const dateLabel = capitalize(startsAt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: TZ }));
  const time = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const services = view.items.map((i) => i.title).join(' + ');
  const active = view.status === 'pending' || view.status === 'confirmed';
  const upcoming = active && startsAt > new Date();
  const ownerFirst = view.studio.ownerName.split(/\s+/)[0];
  const whatsappText = encodeURIComponent(
    `Olá, ${ownerFirst}! Sobre meu agendamento de ${dateLabel.toLowerCase()} às ${time(startsAt)} (${services}): `
  );
  const whatsappUrl = view.studio.whatsapp ? `https://wa.me/${view.studio.whatsapp}?text=${whatsappText}` : '';
  const deadlineLabel = view.cancel.deadline
    ? `${view.cancel.deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ })} às ${time(view.cancel.deadline)}`
    : '';
  const totalLabel =
    view.totalPrice === null
      ? PRICE_ON_REQUEST_LABEL
      : `${formatBRL(view.totalPrice)}${view.items.some((i) => i.price === null) ? ' + sob consulta' : ''}`;

  return (
    <main className={`min-h-screen px-4 py-8 ${t.page}`}>
      {view.studio.themeVariant === 'luxury' && <style>{`html, body { background: #0a0807; }`}</style>}
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <header className="text-center">
          <p className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${t.label}`}>{view.studio.name}</p>
          <h1 className="font-serif text-[28px] leading-tight mt-1">
            {view.clientFirstName ? `${view.clientFirstName}, seu agendamento` : 'Seu agendamento'}
          </h1>
        </header>

        <section className={`rounded-3xl p-5 ${t.card}`}>
          <span className={`inline-block rounded-full px-3 py-1 text-[13px] font-bold ${STATUS_BADGE[view.status]}`}>
            {STATUS_LABEL[view.status]}
            {view.status === 'canceled' && view.canceledBy === 'professional' ? ' pela profissional' : ''}
          </span>

          <p className="font-serif text-[22px] mt-3">{dateLabel}</p>
          <p className={`text-[16px] ${t.muted}`}>
            às {time(startsAt)} · até {time(endsAt)}
          </p>

          <div className={`mt-4 border-t ${t.divider}`}>
            {view.items.map((item, idx) => (
              <div key={idx} className={`flex items-baseline justify-between gap-3 py-2.5 border-b ${t.divider}`}>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{item.title}</p>
                  <p className={`text-[13px] ${t.muted}`}>{durationToLabel(item.durationMinutes)}</p>
                </div>
                <p className="text-[15px] shrink-0">{item.price === null ? PRICE_ON_REQUEST_LABEL : formatBRL(item.price)}</p>
              </div>
            ))}
            {view.items.length > 1 && (
              <div className="flex items-baseline justify-between gap-3 pt-2.5">
                <p className={`text-[13px] font-bold uppercase tracking-wider ${t.label}`}>Total</p>
                <p className="text-[16px] font-bold">{totalLabel}</p>
              </div>
            )}
          </div>

          {view.status === 'canceled' && view.cancelReason && (
            <p className={`mt-4 text-[14px] whitespace-pre-line ${t.muted}`}>
              <span className="font-semibold">Recado de {ownerFirst}:</span> {view.cancelReason}
            </p>
          )}

          {view.status === 'pending' && (
            <p className={`mt-4 text-[14px] ${t.muted}`}>A profissional vai confirmar seu horário. Você pode voltar neste link para ver a confirmação.</p>
          )}
        </section>

        {active && view.studio.postBookingMessage && (
          <section className={`rounded-3xl p-5 ${t.card}`}>
            <p className={`text-[12px] font-semibold uppercase tracking-[0.15em] mb-2 ${t.label}`}>Recado de {ownerFirst}</p>
            <p className="text-[15px] whitespace-pre-line leading-relaxed">{view.studio.postBookingMessage}</p>
          </section>
        )}

        {view.studio.address && (
          <section className={`rounded-3xl p-5 flex items-start gap-3 ${t.card}`}>
            <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${t.label}`} />
            <div className="min-w-0">
              <p className="text-[15px]">{view.studio.address}</p>
              {view.studio.mapsUrl && (
                <a href={view.studio.mapsUrl} target="_blank" rel="noopener noreferrer" className={`text-[14px] font-semibold ${t.link}`}>
                  Ver no mapa
                </a>
              )}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          {upcoming && (
            <a href={`/api/scheduling/appointment/${view.token}/ics?slug=${view.studio.slug}`} className={t.primary}>
              <CalendarPlus className="w-5 h-5" /> Adicionar à agenda do celular
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={t.secondary}>
              <MessageCircle className="w-5 h-5" /> Falar com {ownerFirst} no WhatsApp
            </a>
          )}
          {view.cancel.canCancel && (
            <>
              <ClientCancelButton
                slug={view.studio.slug}
                token={view.token}
                buttonClass={t.secondary}
                dangerClass={t.danger}
                mutedClass={t.muted}
              />
              <p className={`text-[13px] text-center ${t.muted}`}>Dá para cancelar por aqui até {deadlineLabel}.</p>
            </>
          )}
          {!view.cancel.canCancel && view.cancel.reason === 'too_late' && (
            <p className={`text-[14px] text-center ${t.muted}`}>
              O prazo para cancelar por aqui terminou ({view.cancellationNoticeHours}h antes do horário). Se precisar, fale com {ownerFirst} pelo WhatsApp.
            </p>
          )}
        </div>

        <Link href={`/c/${view.studio.slug}`} className={`text-center text-[14px] font-semibold mt-2 ${t.link}`}>
          Ver o catálogo de {view.studio.name}
        </Link>
      </div>
    </main>
  );
}
