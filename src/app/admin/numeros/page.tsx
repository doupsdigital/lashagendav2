import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isAdminRequestAuthorized } from '@/lib/admin-session';
import { getAdminMetrics } from '@/lib/admin/metrics-service';
import type { WindowNumbers } from '@/lib/admin/metrics';

export const dynamic = 'force-dynamic';

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

const ROWS: { key: keyof WindowNumbers; label: string }[] = [
  { key: 'previews', label: 'Prévias criadas' },
  { key: 'approved', label: 'Compras aprovadas' },
  { key: 'renewals', label: 'Renovações pagas' },
  { key: 'cancels', label: 'Cancelamentos' },
  { key: 'refunds', label: 'Reembolsos e chargebacks' },
];

/** Números gerais do admin (F12.1). Confere a sessão aqui também: o layout
 *  só troca a tela pelo login, mas a página não deve nem buscar os dados. */
export default async function AdminNumerosPage() {
  if (!(await isAdminRequestAuthorized())) return null;
  const m = await getAdminMetrics();
  const maxDaily = Math.max(1, ...m.daily.map((d) => Math.max(d.previews, d.approved)));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="font-serif text-2xl font-bold">Números</h1>

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-admin-metrics>
          <Stat label="Pagantes" value={m.payingMensal + m.payingAnual} hint={`${m.payingMensal} mensal · ${m.payingAnual} anual`} />
          <Stat label="Receita mensal (estim.)" value={brl(m.mrr)} hint="anual dividido por 12" />
          <Stat label="Prévias no ar" value={m.previewsLive} hint="dentro das 24h" />
          <Stat label="Vencidos" value={m.lapsed} hint="pagaram e não renovaram" />
          <Stat label="Liberados à mão" value={m.manual} />
          <Stat
            label="Conversão (30 dias)"
            value={m.conversion30 === null ? '—' : `${Math.round(m.conversion30 * 1000) / 10}%`}
            hint="compras ÷ prévias"
          />
        </section>

        {!m.previewsExact && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            Contagem de prévias parcial: falta rodar a migração <code>20261127_preview_log.sql</code>. Até lá, as prévias que
            venceram sem pagar já foram apagadas e não entram na conta.
          </p>
        )}

        <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Movimento</th>
                <th className="px-4 py-3 font-bold text-right">7 dias</th>
                <th className="px-4 py-3 font-bold text-right">30 dias</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.key} className="border-t border-slate-800">
                  <td className="px-4 py-2.5 text-slate-300">{r.label}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{m.d7[r.key]}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{m.d30[r.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-sm font-bold mb-1">Últimos 14 dias</p>
          <p className="text-xs text-slate-500 mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-400 align-middle" /> prévias ·{' '}
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400 align-middle" /> compras
          </p>
          <ul className="flex flex-col gap-1.5">
            {m.daily.map((d) => (
              <li key={d.day} className="flex items-center gap-3 text-xs">
                <span className="w-12 shrink-0 text-slate-500">{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="h-2 rounded bg-sky-400" style={{ width: `${(d.previews / maxDaily) * 100}%`, minWidth: d.previews ? 4 : 0 }} />
                  <div className="h-2 rounded bg-rose-400" style={{ width: `${(d.approved / maxDaily) * 100}%`, minWidth: d.approved ? 4 : 0 }} />
                </div>
                <span className="w-14 shrink-0 text-right text-slate-400">
                  {d.previews} · {d.approved}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
