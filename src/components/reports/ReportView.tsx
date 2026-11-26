import React from 'react';
import Link from 'next/link';
import { ChevronLeft, TrendingUp, Sparkles } from 'lucide-react';
import { formatBRL } from '@/lib/service-format';
import { PERIODS, barLabel, periodLabel, type PeriodId, type ReportPeriod } from '@/lib/dashboard/report';
import type { StudioReport } from '@/lib/dashboard/report-service';

interface ReportViewProps {
  slug: string;
  period: ReportPeriod;
  /** Chip marcado (o personalizado fica marcado mesmo antes das datas). */
  selected: PeriodId;
  problem: string | null;
  customFrom: string;
  customTo: string;
  today: string;
  report: StudioReport;
}

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-ink' }) => (
  <div className="bg-surface border border-linen rounded-2xl p-4 shadow-sm">
    <p className="text-[13px] font-bold uppercase tracking-wider text-ink-faint leading-tight">{label}</p>
    <p className={`font-serif-pro font-semibold text-2xl mt-1.5 ${tone}`}>{value}</p>
  </div>
);

/** Gráfico de receita: uma barra por dia (até 62 dias) ou por mês. Só CSS,
 *  sem biblioteca de gráficos. */
const RevenueChart: React.FC<{ report: StudioReport }> = ({ report }) => {
  const { bars, barUnit } = report;
  const max = Math.max(0, ...bars.map((b) => b.value));
  const multiYear = barUnit === 'month' && bars[0].key.slice(0, 4) !== bars[bars.length - 1].key.slice(0, 4);
  // Rótulos embaixo: todos os meses até 12; senão só alguns, para caber.
  const every = bars.length <= 12 ? 1 : Math.ceil(bars.length / 6);
  return (
    <section className="bg-surface border border-linen rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-rose-600" />
        <h2 className="font-serif-pro font-bold text-[17px] text-ink">Receita {barUnit === 'day' ? 'por dia' : 'por mês'}</h2>
        {max > 0 && <span className="ml-auto text-[13px] text-ink-faint">maior: {formatBRL(max)}</span>}
      </div>
      {max === 0 ? (
        <p className="text-[15px] text-ink-soft">Nenhum valor recebido no período.</p>
      ) : (
        <>
          <div className="h-36 flex items-end gap-[2px]" role="img" aria-label="Gráfico da receita no período">
            {bars.map((b) => (
              <div
                key={b.key}
                title={`${barLabel(b.key, multiYear)}: ${formatBRL(b.value)}`}
                className={`flex-1 rounded-t-sm ${b.value > 0 ? 'bg-rose-400' : 'bg-linen'}`}
                style={{ height: b.value > 0 ? `${Math.max(4, (b.value / max) * 100)}%` : '2px' }}
              />
            ))}
          </div>
          <div className="flex gap-[2px] mt-1.5">
            {bars.map((b, i) => (
              <span key={b.key} className="flex-1 min-w-0 text-center text-[11px] text-ink-faint overflow-visible whitespace-nowrap">
                {i % every === 0 ? barLabel(b.key, multiYear) : ''}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

/** Relatórios (F9.2): escolha do período e os números dele. */
export const ReportView: React.FC<ReportViewProps> = ({ slug, period, selected, problem, customFrom, customTo, today, report }) => {
  const base = `/app/${slug}/relatorios`;
  const maxService = report.topServices[0]?.count ?? 0;
  return (
    <>
      <Link href={`/app/${slug}/inicio`} className="flex items-center gap-1 text-[15px] font-semibold text-rose-600 -mb-1">
        <ChevronLeft className="w-4 h-4" /> Início
      </Link>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {PERIODS.map((p) => {
          const on = selected === p.id;
          return (
            <Link
              key={p.id}
              href={`${base}?periodo=${p.id}`}
              aria-current={on ? 'page' : undefined}
              className={`shrink-0 h-10 flex items-center rounded-full border px-4 text-[15px] font-semibold transition active:scale-95 ${
                on ? 'bg-rose-600 border-rose-600 text-white' : 'bg-surface border-linen text-ink'
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {selected === 'personalizado' && (
        // GET simples: as datas vão na URL e a página recarrega com elas.
        <form action={base} method="get" className="bg-surface border border-linen rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <input type="hidden" name="periodo" value="personalizado" />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink-soft">
              De
              <input
                type="date"
                name="de"
                required
                defaultValue={customFrom}
                className="h-11 rounded-xl border border-linen bg-cream px-3 text-[15px] text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink-soft">
              Até
              <input
                type="date"
                name="ate"
                required
                defaultValue={customTo}
                className="h-11 rounded-xl border border-linen bg-cream px-3 text-[15px] text-ink"
              />
            </label>
          </div>
          <button type="submit" className="h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold">
            Ver período
          </button>
        </form>
      )}

      {problem && <p className="text-[15px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{problem} Mostrando este mês.</p>}

      <p className="text-[15px] text-ink-soft">
        <span className="font-semibold text-ink">{PERIODS.find((p) => p.id === period.id)?.label}</span> · {periodLabel(period)}
      </p>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-rose-200 to-rose-100 border border-rose-200/60">
        <p className="text-[13px] font-bold uppercase tracking-wider text-rose-800/70">Valor recebido</p>
        <p className="font-serif-pro font-bold text-3xl text-rose-800 mt-1">{formatBRL(report.received)}</p>
        <p className="text-[14px] text-rose-800/70 mt-1">
          {report.completed === 1 ? '1 atendimento concluído' : `${report.completed} atendimentos concluídos`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Agendamentos" value={report.total} />
        <Stat label="Concluídos" value={report.completed} tone="text-rose-600" />
        <Stat label="Cancelamentos" value={report.canceled} tone="text-neutral-600" />
        <Stat label="Faltas" value={report.noShows} tone="text-amber-700" />
        <Stat label="Clientes novas" value={report.newClients} />
        <Stat label="A acontecer" value={report.open} tone="text-ink-soft" />
      </div>

      {report.bars.length > 1 && <RevenueChart report={report} />}

      <section className="bg-surface border border-linen rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <h2 className="font-serif-pro font-bold text-[17px] text-ink">Serviços mais feitos</h2>
        </div>
        {report.topServices.length === 0 ? (
          <p className="text-[15px] text-ink-soft">Nenhum atendimento concluído no período.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {report.topServices.map((s) => (
              <li key={s.title}>
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="font-semibold text-ink truncate">{s.title}</span>
                  <span className="text-ink-soft shrink-0">{s.count}×</span>
                </div>
                <div className="h-1.5 rounded-full bg-linen mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${(s.count / maxService) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[13px] text-ink-faint">
        Contam os agendamentos com data no período, inclusive os atendimentos registrados no histórico das clientes.
        Valor recebido e serviços: só os concluídos.
      </p>
    </>
  );
};
