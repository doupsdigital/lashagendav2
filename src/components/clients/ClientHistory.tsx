import React from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/service-format';
import { DeleteRecordButton } from './DeleteRecordButton';
import { historyStatusLabel, type ClientHistorySummary, type HistoryAppointment } from '@/lib/clients/client-history';

const TZ = 'America/Sao_Paulo';

function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
  const hour = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  return `${date} às ${hour}`;
}

/** Resumo no topo do perfil (F7.3). */
export function ClientHistorySummaryCard({ summary }: { summary: ClientHistorySummary }) {
  const stats = [
    { label: summary.visits === 1 ? 'atendimento' : 'atendimentos', value: String(summary.visits) },
    { label: 'total gasto', value: formatBRL(summary.totalSpent) },
    { label: summary.noShows === 1 ? 'falta' : 'faltas', value: String(summary.noShows) },
  ];
  return (
    <div className="rounded-2xl bg-surface border border-linen p-4 flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-cream py-2.5 px-1">
            <p className="font-bold text-lg text-ink leading-tight">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-soft">
        {summary.next ? (
          <>
            Próximo: <strong className="text-ink">{whenLabel(summary.next.starts_at)}</strong>
          </>
        ) : (
          'Nenhum agendamento marcado.'
        )}
        {summary.lastVisit && <> · Último atendimento em {whenLabel(summary.lastVisit.starts_at).split(' às ')[0]}</>}
      </p>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  no_show: 'bg-amber-50 text-amber-800',
  canceled: 'bg-linen text-ink-soft',
  confirmed: 'bg-rose-50 text-rose-700',
  pending: 'bg-amber-50 text-amber-800',
};

function valueLabel(a: HistoryAppointment): string | null {
  if (a.status === 'completed') {
    if (a.amount_received === null) return 'sem valor';
    if (a.total_price !== null && a.amount_received !== a.total_price) {
      return `${formatBRL(a.amount_received)} (de ${formatBRL(a.total_price)})`;
    }
    return formatBRL(a.amount_received);
  }
  if (a.status === 'pending' || a.status === 'confirmed') return a.total_price === null ? 'sob consulta' : formatBRL(a.total_price);
  return null;
}

function HistoryItem({ slug, clientId, a, now }: { slug: string; clientId: string; a: HistoryAppointment; now: Date }) {
  const value = valueLabel(a);
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-ink text-[15px]">{a.origin === 'record' ? whenLabel(a.starts_at).split(' às ')[0] : whenLabel(a.starts_at)}</p>
        {value && <p className="text-[15px] font-semibold text-ink shrink-0">{value}</p>}
      </div>
      <p className="text-sm text-ink-soft">{a.services.join(' + ') || 'Atendimento'}</p>
      <span className={`self-start text-xs font-semibold rounded-full px-2.5 py-0.5 ${STATUS_TONE[a.status] || 'bg-linen text-ink-soft'}`}>
        {historyStatusLabel(a, now)}
      </span>
      {a.status === 'canceled' && a.cancel_reason && <p className="text-sm text-ink-soft">Motivo: {a.cancel_reason}</p>}
      {a.notes && <p className="text-sm text-ink-soft whitespace-pre-line break-words">Sua anotação: {a.notes}</p>}
    </>
  );
  // Registro manual (F7.4) não tem horário na agenda — não leva até ela.
  if (a.origin === 'record') {
    return (
      <li className="px-4 py-3 flex flex-col gap-1">
        {content}
        <DeleteRecordButton slug={slug} clientId={clientId} recordId={a.id} />
      </li>
    );
  }
  return (
    <li>
      <Link href={`/app/${slug}/agenda?date=${dateKey(a.starts_at)}`} className="px-4 py-3 flex flex-col gap-1 active:bg-cream">
        {content}
      </Link>
    </li>
  );
}

interface ClientHistoryListProps {
  slug: string;
  clientId: string;
  upcoming: HistoryAppointment[];
  past: HistoryAppointment[];
  /** ISO do "agora" usado na separação (o mesmo do servidor). */
  nowIso: string;
}

/** Agendamentos futuros e passados da cliente (F7.3). */
export function ClientHistoryList({ slug, clientId, upcoming, past, nowIso }: ClientHistoryListProps) {
  const now = new Date(nowIso);
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="rounded-2xl bg-surface border border-linen p-5 text-center">
        <p className="text-[15px] text-ink-soft">Ela ainda não tem nenhum agendamento.</p>
      </div>
    );
  }
  return (
    <>
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif-pro font-bold text-lg text-ink">Próximos</h2>
          <ul className="rounded-2xl bg-surface border border-linen divide-y divide-linen overflow-hidden">
            {upcoming.map((a) => (
              <HistoryItem key={a.id} slug={slug} clientId={clientId} a={a} now={now} />
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-serif-pro font-bold text-lg text-ink">Histórico</h2>
          <ul className="rounded-2xl bg-surface border border-linen divide-y divide-linen overflow-hidden">
            {past.map((a) => (
              <HistoryItem key={a.id} slug={slug} clientId={clientId} a={a} now={now} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
