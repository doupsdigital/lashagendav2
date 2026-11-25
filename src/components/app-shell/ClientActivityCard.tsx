import React from 'react';
import Link from 'next/link';
import { Bell, CalendarCheck, CalendarX, ChevronRight, Clock } from 'lucide-react';
import type { ClientActivity } from '@/lib/scheduling/agenda-service';
import { relativeTimeLabel } from '@/lib/scheduling/client-activity';

interface ClientActivityCardProps {
  slug: string;
  activity: ClientActivity[];
  now?: Date;
}

const TZ = 'America/Sao_Paulo';

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: TZ }).replace('.', '');
  const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  return `${weekday}, ${dayMonth} às ${time}`;
}

/** Novidades do Início (F5.6): o que as clientes fizeram pelo catálogo nos
 *  últimos dias. Cada linha leva ao dia na Agenda — ou à lista de
 *  "aguardando" quando ainda precisa da confirmação dela. */
export const ClientActivityCard: React.FC<ClientActivityCardProps> = ({ slug, activity, now = new Date() }) => {
  if (activity.length === 0) return null;

  return (
    <section className="bg-surface border border-linen rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Bell className="w-4 h-4 text-rose-600" />
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-faint">Novidades das clientes</h2>
      </div>
      <ul>
        {activity.map((a) => {
          const firstName = a.client_name.trim().split(/\s+/)[0];
          const dateKey = new Date(a.starts_at).toLocaleDateString('en-CA', { timeZone: TZ });
          const pending = a.kind === 'booked' && a.status === 'pending';
          const href = pending ? `/app/${slug}/agenda#pendentes` : `/app/${slug}/agenda?date=${dateKey}`;
          const Icon = a.kind === 'canceled' ? CalendarX : pending ? Clock : CalendarCheck;
          const iconTone =
            a.kind === 'canceled' ? 'bg-neutral-100 text-neutral-500' : pending ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600';
          return (
            <li key={`${a.id}-${a.kind}`} className="border-t border-linen first:border-t-0">
              <Link href={href} className="flex items-center gap-3 px-4 py-3 active:bg-rose-50/60">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] text-ink leading-snug">
                    <b>{firstName}</b> {a.kind === 'canceled' ? 'cancelou' : 'agendou'}{' '}
                    <span className="text-ink-faint text-[13px]">· {relativeTimeLabel(new Date(a.at), now)}</span>
                  </span>
                  <span className={`block text-[13px] truncate ${a.kind === 'canceled' ? 'text-ink-faint line-through' : 'text-ink-soft'}`}>
                    {a.service_title} · {whenLabel(a.starts_at)}
                  </span>
                  {pending && <span className="block text-[12px] font-bold text-amber-700 mt-0.5">Toque para confirmar</span>}
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
