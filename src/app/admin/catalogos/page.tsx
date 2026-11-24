'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, RefreshCw, Search, Smartphone, Pencil, MessageCircle, Trash2, Webhook } from 'lucide-react';
import { usesSubdomainRouting, PRODUCTION_DOMAIN } from '@/lib/public-url';
import { normalizeWhatsappBR } from '@/lib/format';
import { hasPaidAccess, isAccessLapsed, isPreviewExpired } from '@/lib/studio-access';
import type { PlanStatus } from '@/types/studio';

/** Lista de estúdios do admin — versão enxuta para o modelo v2 (F2.2). O
 *  painel completo (números, busca de cliente, suporte) é a F12. */

interface AdminStudio {
  id: string;
  slug: string;
  owner_name: string;
  studio_name: string | null;
  whatsapp: string | null;
  billing_email: string | null;
  plan_status: PlanStatus;
  cakto_plan: 'mensal' | 'anual' | null;
  paid_until: string | null;
  manual_plan: boolean;
  disabled: boolean;
  agenda_paused: boolean;
  preview_expires_at: string | null;
  app_short_code: string | null;
  edit_token: string;
  created_at: string;
}

type ListFilter = 'pagantes' | 'previas' | 'todos';

const STATUS_LABEL: Record<PlanStatus, string> = {
  preview: 'Prévia',
  active: 'Ativa',
  suspended: 'Renovação recusada',
  canceled: 'Cancelada',
};

function formatDate(iso: string | null, withYear = true) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    ...(withYear ? { year: '2-digit' } : {}),
  });
}

function buildLinks(item: AdminStudio) {
  if (typeof window === 'undefined') return { official: '', app: '', edit: '' };
  const { hostname, origin } = window.location;
  const subdomain = usesSubdomainRouting(hostname);
  const root = subdomain ? `https://${item.slug}.${PRODUCTION_DOMAIN}` : origin;
  const official = subdomain ? root : `${root}/c/${item.slug}`;
  const rootDomain = subdomain ? `https://${PRODUCTION_DOMAIN}` : origin;
  const app = item.app_short_code
    ? `${rootDomain}/a/${item.app_short_code}`
    : `${rootDomain}/api/professional/login?slug=${item.slug}&token=${item.edit_token}`;
  const edit = item.app_short_code ? `${root}/e/${item.app_short_code}` : `${official}?edit=${item.edit_token}`;
  return { official, app, edit };
}

function statusBadge(item: AdminStudio): { text: string; className: string } {
  if (item.disabled) return { text: 'Desativada', className: 'bg-slate-700 text-slate-300' };
  if (item.plan_status === 'preview') {
    return isPreviewExpired(item)
      ? { text: 'Prévia vencida', className: 'bg-slate-700 text-slate-300' }
      : { text: 'Prévia', className: 'bg-sky-500/15 text-sky-300' };
  }
  if (item.manual_plan) return { text: 'Liberada à mão', className: 'bg-amber-500/15 text-amber-300' };
  if (isAccessLapsed(item)) return { text: 'Fora do ar', className: 'bg-red-500/15 text-red-300' };
  return { text: STATUS_LABEL[item.plan_status], className: 'bg-emerald-500/15 text-emerald-300' };
}

export default function AdminCatalogosPage() {
  const [studios, setStudios] = useState<AdminStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ListFilter>('pagantes');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStudios = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/catalogs-list', { credentials: 'same-origin' });
      const result = await res.json();
      if (result.success) setStudios(result.catalogs as AdminStudio[]);
      else showToast('❌ Erro ao buscar estúdios.');
    } catch {
      showToast('❌ Erro ao buscar estúdios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  const patch = async (item: AdminStudio, updates: Partial<Pick<AdminStudio, 'disabled' | 'manual_plan'>>, okMsg: string) => {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/catalog-actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ...updates }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      setStudios((list) => list.map((s) => (s.id === item.id ? { ...s, ...updates } : s)));
      showToast(okMsg);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Erro ao salvar.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const activateCakto = async (item: AdminStudio, plan: 'mensal' | 'anual') => {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/cakto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, plan }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      showToast(`✅ ${plan === 'anual' ? 'Anual' : 'Mensal'} ativado até ${formatDate(result.paidUntil)}`);
      await fetchStudios();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Erro ao ativar.'}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: AdminStudio) => {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/catalog-actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      setStudios((list) => list.filter((s) => s.id !== item.id));
      showToast('🗑️ Estúdio excluído.');
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Erro ao excluir.'}`);
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  };

  const counts = useMemo(
    () => ({
      pagantes: studios.filter((s) => s.plan_status !== 'preview' || s.manual_plan).length,
      previas: studios.filter((s) => s.plan_status === 'preview' && !s.manual_plan).length,
      todos: studios.length,
    }),
    [studios]
  );

  const visible = studios.filter((s) => {
    const isPreview = s.plan_status === 'preview' && !s.manual_plan;
    if (filter === 'pagantes' && isPreview) return false;
    if (filter === 'previas' && !isPreview) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [s.owner_name, s.studio_name, s.slug, s.billing_email, s.whatsapp].some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cakto"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              <Webhook className="w-4 h-4" /> Cakto
            </Link>
            <button
              type="button"
              onClick={fetchStudios}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        <h1 className="font-serif text-2xl font-bold mb-4">Estúdios</h1>

        <div className="flex flex-wrap gap-2 mb-3">
          {(['pagantes', 'previas', 'todos'] as ListFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                filter === f ? 'bg-rose-500 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {f === 'pagantes' ? 'Clientes' : f === 'previas' ? 'Prévias' : 'Todos'} ({counts[f]})
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 px-3 py-2.5 mb-5 rounded-xl bg-slate-900 border border-slate-800">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, slug, e-mail ou WhatsApp"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"
          />
        </label>

        {isLoading && studios.length === 0 ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum estúdio aqui.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((item) => {
              const badge = statusBadge(item);
              const links = buildLinks(item);
              const busy = busyId === item.id;
              const whatsapp = normalizeWhatsappBR(item.whatsapp);
              return (
                <li key={item.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[15px] truncate">{item.owner_name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.slug} · criado em {formatDate(item.created_at)}
                        {item.billing_email ? ` · ${item.billing_email}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.className}`}>{badge.text}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    {item.plan_status === 'preview'
                      ? `Prévia até ${formatDate(item.preview_expires_at)}`
                      : `${item.cakto_plan === 'anual' ? 'Anual' : item.cakto_plan === 'mensal' ? 'Mensal' : 'Sem plano'} · pago até ${formatDate(item.paid_until)}`}
                    {hasPaidAccess(item) && item.agenda_paused ? ' · agenda pausada' : ''}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={links.official} target="_blank" rel="noopener noreferrer" className="admin-chip">
                      <ExternalLink className="w-3.5 h-3.5" /> Catálogo
                    </a>
                    <a href={links.app} target="_blank" rel="noopener noreferrer" className="admin-chip">
                      <Smartphone className="w-3.5 h-3.5" /> App
                    </a>
                    <a href={links.edit} target="_blank" rel="noopener noreferrer" className="admin-chip">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </a>
                    {whatsapp && (
                      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="admin-chip">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button type="button" disabled={busy} onClick={() => activateCakto(item, 'mensal')} className="admin-chip">
                      + 1 mês
                    </button>
                    <button type="button" disabled={busy} onClick={() => activateCakto(item, 'anual')} className="admin-chip">
                      + 1 ano
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        patch(item, { manual_plan: !item.manual_plan }, item.manual_plan ? 'Liberação manual removida.' : 'Liberado à mão.')
                      }
                      className="admin-chip"
                    >
                      {item.manual_plan ? 'Tirar liberação manual' : 'Liberar à mão'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => patch(item, { disabled: !item.disabled }, item.disabled ? 'Estúdio reativado.' : 'Estúdio desativado.')}
                      className="admin-chip"
                    >
                      {item.disabled ? 'Reativar' : 'Desativar'}
                    </button>
                    {confirmDeleteId === item.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-red-300 font-bold">Apagar tudo dela?</span>
                        <button type="button" disabled={busy} onClick={() => remove(item)} className="admin-chip !border-red-500/40 !text-red-300">
                          Sim, excluir
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="admin-chip">
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => setConfirmDeleteId(item.id)} className="admin-chip !text-red-300">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <style>{`
        .admin-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 10px;
          background: rgb(15 23 42); border: 1px solid rgb(30 41 59);
          font-size: 12px; font-weight: 700; color: rgb(203 213 225);
        }
        .admin-chip:hover { color: white; }
        .admin-chip:disabled { opacity: .5; }
      `}</style>
    </main>
  );
}
