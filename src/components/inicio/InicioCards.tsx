import React from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarPlus, ChevronRight, Clock, Lock } from 'lucide-react';
import type { AgendaAppointment } from '@/lib/scheduling/agenda-service';
import { dayTag, shortDuration, type DayTagTone } from '@/lib/dashboard/inicio-numbers';

const TZ = 'America/Sao_Paulo';
const PENDING_SHOWN = 3;

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

function dayLabel(iso: string, todayStr: string): string {
  const key = new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
  if (key === todayStr) return 'Hoje';
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: TZ }).replace('.', '');
  const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

/** Atenção primeiro (F9.1): o que espera a confirmação dela. Some quando não
 *  há nada pendente. */
export const PendingAttentionCard: React.FC<{ slug: string; pending: AgendaAppointment[]; todayStr: string }> = ({
  slug,
  pending,
  todayStr,
}) => {
  if (pending.length === 0) return null;
  const rest = pending.length - PENDING_SHOWN;
  return (
    <section data-tour="stat-pending" className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Clock className="w-4 h-4 text-amber-700" />
        <h2 className="font-bold text-[16px] text-amber-900">
          {pending.length === 1 ? '1 agendamento aguardando você' : `${pending.length} agendamentos aguardando você`}
        </h2>
      </div>
      <ul>
        {pending.slice(0, PENDING_SHOWN).map((a) => (
          <li key={a.id} className="border-t border-amber-200/70 first:border-t-0">
            <Link href={`/app/${slug}/agenda#pendentes`} className="flex items-center gap-3 px-4 py-2.5 active:bg-amber-100/60">
              <span className="text-[14px] font-bold text-amber-800 w-[92px] shrink-0 leading-tight">
                {dayLabel(a.starts_at, todayStr)}
                <span className="block">{timeLabel(a.starts_at)}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink truncate">{a.client_name}</span>
                <span className="block text-[14px] text-ink-soft truncate">{a.service_title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/app/${slug}/agenda#pendentes`}
        className="flex items-center justify-center gap-1 border-t border-amber-200/70 px-4 py-3 text-[15px] font-bold text-amber-800"
      >
        {rest > 0 ? `Ver todos (mais ${rest})` : 'Confirmar na agenda'} <ChevronRight className="w-4 h-4" />
      </Link>
    </section>
  );
};

const TAG_TONES: Record<DayTagTone, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700',
  gray: 'bg-neutral-100 text-neutral-600',
};

/** Agenda de hoje (F9.1): os horários do dia, na ordem. */
export const TodayAgendaCard: React.FC<{ slug: string; appointments: AgendaAppointment[] }> = ({ slug, appointments }) => (
  <section className="bg-surface border border-linen rounded-2xl shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      <CalendarDays className="w-4 h-4 text-rose-600" />
      <h2 className="font-serif-pro font-bold text-[17px] text-ink">Agenda de hoje</h2>
    </div>
    {appointments.length === 0 ? (
      <p className="px-4 pb-4 text-[15px] text-ink-soft">Nada marcado para hoje.</p>
    ) : (
      <ul>
        {appointments.map((a) => {
          const tag = dayTag(a.status);
          return (
            <li key={a.id} className="border-t border-linen first:border-t-0">
              <Link href={`/app/${slug}/agenda`} className="flex items-center gap-3 px-4 py-3 active:bg-rose-50/60">
                <span className="font-bold text-rose-700 w-12 shrink-0">{timeLabel(a.starts_at)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-ink truncate">{a.client_name}</span>
                  <span className="block text-[14px] text-ink-soft truncate">
                    {a.service_title} · {shortDuration(a.duration_minutes)}
                  </span>
                </span>
                <span className={`shrink-0 text-[12px] font-bold px-2 py-1 rounded-full ${TAG_TONES[tag.tone]}`}>{tag.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    )}
    <Link
      href={`/app/${slug}/agenda`}
      className="flex items-center justify-center gap-1 border-t border-linen px-4 py-3 text-[15px] font-bold text-rose-600"
    >
      Ver agenda <ChevronRight className="w-4 h-4" />
    </Link>
  </section>
);

/** Ações rápidas (F9.1): abrem a Agenda já com o formulário certo aberto.
 *  Compartilhar o link fica no card "Compartilhe seu Catálogo". */
export const QuickActions: React.FC<{ slug: string }> = ({ slug }) => (
  <div className="grid grid-cols-2 gap-3">
    <Link
      href={`/app/${slug}/agenda?abrir=novo`}
      className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white py-3.5 text-[15px] font-bold shadow-sm active:scale-[0.98] transition-transform"
    >
      <CalendarPlus className="w-5 h-5" /> Novo agendamento
    </Link>
    <Link
      href={`/app/${slug}/agenda?abrir=trancar`}
      className="flex items-center justify-center gap-2 rounded-2xl bg-surface border border-rose-300 text-rose-700 py-3.5 text-[15px] font-bold shadow-sm active:scale-[0.98] transition-transform"
    >
      <Lock className="w-5 h-5" /> Trancar horário
    </Link>
  </div>
);
