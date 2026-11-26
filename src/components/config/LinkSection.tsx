'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Download, Printer, Share2 } from 'lucide-react';
import { PRODUCTION_DOMAIN, publicCatalogUrl } from '@/lib/public-url';
import { finalSlug, migrateStorageKey, slugProblem, typeSlug, MAX_SLUG } from '@/lib/studio/slug-rules';

interface LinkSectionProps {
  slug: string;
  /** QR do link oficial (PNG em data URL, gerado no servidor). */
  qrDataUrl: string;
}

/** Leva as marcas de "já visto" deste aparelho para o slug novo. */
function migrateLocalKeys(oldSlug: string, newSlug: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      const next = migrateStorageKey(k, oldSlug, newSlug);
      if (next) {
        const v = window.localStorage.getItem(k);
        if (v !== null) window.localStorage.setItem(next, v);
      }
    }
  } catch {
    // Sem localStorage: no máximo os balões de ajuda aparecem de novo.
  }
}

/** Meu link (F10.3): o endereço do catálogo, copiar/compartilhar, QR code e
 *  a troca do endereço (com confirmação — o link antigo para de funcionar). */
export const LinkSection: React.FC<LinkSectionProps> = ({ slug, qrDataUrl }) => {
  const display = `${slug}.${PRODUCTION_DOMAIN}`;
  const [url, setUrl] = useState(`https://${display}`);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Em localhost/preview o subdomínio não funciona: copia o /c/<slug>.
    setUrl(publicCatalogUrl(slug, window.location));
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [slug]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem área de transferência: o endereço continua visível para copiar à mão.
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Meu catálogo', url });
    } catch {
      // Cancelou o compartilhamento: nada a fazer.
    }
  };

  const candidate = finalSlug(draft);
  const problem = draft ? slugProblem(candidate) : null;
  const canSubmit = Boolean(draft) && !problem && candidate !== slug && understood && !saving;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/professional/slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, new_slug: candidate, confirm: true }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível trocar. Tente de novo.');
        setSaving(false);
        return;
      }
      migrateLocalKeys(slug, json.slug);
      // Navegação completa: o app inteiro passa a ter outro endereço.
      window.location.href = `/app/${json.slug}/config#link`;
    } catch {
      setError('Falha na conexão. Tente de novo.');
      setSaving(false);
    }
  };

  const btn = 'flex-1 h-11 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2';

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
        <p className="text-[13px] font-bold uppercase tracking-wider text-rose-800/70">Seu link</p>
        <p className="font-bold text-[17px] text-rose-800 break-all">{display}</p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={copy} className={`${btn} bg-rose-600 text-white`}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado!' : 'Copiar'}
        </button>
        {canShare && (
          <button type="button" onClick={share} className={`${btn} bg-surface border border-rose-300 text-rose-700`}>
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-linen bg-surface p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code do link ${display}`} className="w-44 h-44" />
        <p className="text-[14px] text-ink-soft text-center">A cliente aponta a câmera do celular e abre seu catálogo.</p>
        <div className="flex gap-2 w-full">
          <a href={qrDataUrl} download={`qr-${slug}.png`} className={`${btn} bg-surface border border-rose-300 text-rose-700`}>
            <Download className="w-4 h-4" /> Baixar
          </a>
          <Link href={`/app/${slug}/config/qr`} className={`${btn} bg-surface border border-rose-300 text-rose-700`}>
            <Printer className="w-4 h-4" /> Imprimir
          </Link>
        </div>
      </div>

      {!changing ? (
        <button type="button" onClick={() => setChanging(true)} className="self-start text-[15px] font-bold text-rose-600">
          Trocar o endereço do link
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-bold text-[15px] text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Antes de trocar
          </p>
          <ul className="list-disc pl-5 text-[14px] text-amber-900 leading-snug flex flex-col gap-1">
            <li>
              O link <b>{display}</b> para de funcionar. Quem tiver o link antigo (bio do Instagram, mensagens, QR impresso) não acha mais seu catálogo.
            </li>
            <li>Você vai precisar atualizar a bio e imprimir o QR code de novo.</li>
            <li>O app instalado no celular continua abrindo, mas o certo é instalar de novo pelo endereço novo.</li>
          </ul>

          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-ink-soft">Novo endereço</span>
            <div className="flex items-center rounded-xl border border-linen bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-rose-300">
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(typeSlug(e.target.value));
                  setError(null);
                }}
                maxLength={MAX_SLUG}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={slug}
                className="flex-1 min-w-0 h-12 px-3 text-[16px] text-ink bg-transparent focus:outline-none"
              />
              <span className="pr-3 text-[15px] text-ink-faint shrink-0">.{PRODUCTION_DOMAIN}</span>
            </div>
            {problem ? (
              <span className="text-[14px] text-rose-700">{problem}</span>
            ) : draft && candidate === slug ? (
              <span className="text-[14px] text-ink-soft">Esse já é o seu endereço.</span>
            ) : (
              <span className="text-[13px] text-ink-faint">Letras, números e hífen.</span>
            )}
          </label>

          <label className="flex items-start gap-2.5 text-[14px] text-amber-900">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 w-5 h-5 accent-rose-600 shrink-0" />
            Entendi que o link antigo para de funcionar.
          </label>

          {error && <p className="text-[14px] text-rose-700">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setChanging(false);
                setDraft('');
                setUnderstood(false);
                setError(null);
              }}
              className={`${btn} bg-surface border border-linen text-ink`}
            >
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={!canSubmit} className={`${btn} bg-rose-600 text-white disabled:opacity-50`}>
              {saving ? 'Trocando…' : 'Trocar endereço'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
