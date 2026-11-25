'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, UserPlus, X } from 'lucide-react';
import { formatPhoneBR, normalizeWhatsappBR } from '@/lib/format';
import { matchesClientQuery, visitsLabel, MAX_CLIENT_NAME, type ClientListItem } from '@/lib/clients/client-list';

interface ClientsClientProps {
  slug: string;
  clients: ClientListItem[];
}

/** Quantas aparecem de uma vez; o resto se acha pela busca. */
const SHOW_LIMIT = 200;

export const ClientsClient: React.FC<ClientsClientProps> = ({ slug, clients }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => clients.filter((c) => matchesClientQuery(c, query)), [clients, query]);
  const shown = filtered.slice(0, SHOW_LIMIT);
  const searching = query.trim() !== '';
  // Busca por nome sem resultado: oferece cadastrar com o nome já preenchido.
  const prefillName = searching && !/^[\d\s()+.-]+$/.test(query) ? query.trim() : '';

  const openNew = () => {
    setNotice(null);
    setNewOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-pro font-bold text-2xl text-ink leading-tight">Suas clientes</h1>
          <p className="text-[15px] text-ink-soft">
            {clients.length === 0 ? 'Nenhuma ainda' : clients.length === 1 ? '1 cliente' : `${clients.length} clientes`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="h-11 px-4 rounded-xl bg-rose-600 text-white text-[15px] font-bold flex items-center gap-2 shrink-0 active:scale-95 transition"
        >
          <UserPlus className="w-4 h-4" /> Nova cliente
        </button>
      </div>

      {notice && (
        <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[15px] px-4 py-3">{notice}</p>
      )}

      {clients.length > 0 && (
        <label className="relative block">
          <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp"
            aria-label="Buscar cliente"
            className="w-full h-12 rounded-xl border border-linen bg-surface pl-10 pr-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400"
          />
        </label>
      )}

      {clients.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-linen p-6 text-center flex flex-col gap-2">
          <p className="font-bold text-ink">Suas clientes vão aparecer aqui</p>
          <p className="text-[15px] text-ink-soft">
            Quem agendar pelo seu catálogo entra sozinha. Você também pode cadastrar à mão, no botão acima.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-linen p-6 text-center flex flex-col gap-3">
          <p className="text-[15px] text-ink-soft">Nenhuma cliente encontrada para “{query.trim()}”.</p>
          {prefillName && (
            <button type="button" onClick={openNew} className="text-[15px] font-bold text-rose-600">
              Cadastrar “{prefillName}”
            </button>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl bg-surface border border-linen divide-y divide-linen overflow-hidden">
          {shown.map((c) => (
            <li key={c.id} className="flex items-center gap-3 pr-4">
              <Link href={`/app/${slug}/clientes/${c.id}`} className="flex items-center gap-3 min-w-0 flex-1 pl-4 py-3 active:bg-cream">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">
                  {c.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{c.name}</p>
                  <p className="text-sm text-ink-soft truncate">{visitsLabel(c.visits, c.lastVisit)}</p>
                </div>
              </Link>
              {c.whatsapp ? (
                <a
                  href={`https://wa.me/${normalizeWhatsappBR(c.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp de ${c.name} · ${formatPhoneBR(c.whatsapp)}`}
                  className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 active:scale-90 transition"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              ) : (
                <span className="text-xs text-ink-faint shrink-0">sem WhatsApp</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {filtered.length > SHOW_LIMIT && (
        <p className="text-sm text-ink-soft text-center">
          Mostrando {SHOW_LIMIT} de {filtered.length}. Use a busca para achar as outras.
        </p>
      )}

      {newOpen && (
        <NewClientSheet
          slug={slug}
          defaultName={filtered.length === 0 ? prefillName : ''}
          onClose={() => setNewOpen(false)}
          onCreated={(name) => {
            setNewOpen(false);
            setQuery('');
            setNotice(`${name} foi cadastrada.`);
            router.refresh();
          }}
          onDuplicate={(id) => router.push(`/app/${slug}/clientes/${id}`)}
        />
      )}
    </>
  );
};

interface NewClientSheetProps {
  slug: string;
  defaultName: string;
  onClose: () => void;
  onCreated: (name: string) => void;
  /** WhatsApp já é de outra cliente: abre o perfil dela. */
  onDuplicate: (id: string) => void;
}

const NewClientSheet: React.FC<NewClientSheetProps> = ({ slug, defaultName, onClose, onCreated, onDuplicate }) => {
  const [name, setName] = useState(defaultName);
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Escreva o nome da cliente.');
      return;
    }
    setSaving(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch('/api/professional/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, whatsapp }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated(json.client.name);
        return;
      }
      if (json.reason === 'duplicate') setDuplicate(json.duplicate);
      setError(json.message || 'Não foi possível cadastrar.');
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-8 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linen text-ink-soft flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="font-serif-pro font-bold text-lg text-ink pr-8">Nova cliente</p>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-soft">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_CLIENT_NAME}
            autoFocus
            autoComplete="off"
            className="h-12 rounded-xl border border-linen bg-cream px-4 text-[16px] text-ink focus:outline-none focus:border-rose-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink-soft">WhatsApp (opcional)</span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            autoComplete="off"
            className="h-12 rounded-xl border border-linen bg-cream px-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {duplicate && (
          <button type="button" onClick={() => onDuplicate(duplicate.id)} className="text-[15px] font-bold text-rose-600 text-left">
            Ver {duplicate.name}
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-60 mt-1"
        >
          {saving ? 'Cadastrando...' : 'Cadastrar cliente'}
        </button>
      </form>
    </div>
  );
};
