'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, Sparkles, Clock, Check } from 'lucide-react';
import { MAX_TECH_DAYS, TECH_SECTIONS, type TechField, type TechnicalSheet } from '@/lib/clients/client-technical';

interface TechnicalSheetFormProps {
  slug: string;
  clientId: string;
  clientName: string;
  initial: TechnicalSheet;
  /** Última vez que a ficha foi salva (ISO), se já foi. */
  updatedAt: string | null;
}

/** Valor no formulário: escolha e textos como string, sim/não como boolean.
 *  Vazio = `undefined`. */
type FormValue = string | boolean | undefined;
type FormState = Record<string, FormValue>;

const SECTION_ICONS = [Eye, Sparkles, Clock];

function toForm(sheet: TechnicalSheet): FormState {
  const state: FormState = {};
  for (const [k, v] of Object.entries(sheet)) state[k] = typeof v === 'number' ? String(v) : v;
  return state;
}

function toPayload(state: FormState): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(state)) {
    if (v === undefined || v === '') continue;
    out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

const chipBase = 'min-h-11 rounded-full border px-4 py-2 text-[15px] font-semibold transition active:scale-95 text-left';
const chipOn = 'bg-rose-600 border-rose-600 text-white';
const chipOff = 'bg-surface border-linen text-ink';

/** Ficha técnica (F8.1): tudo em chips, um toque escolhe, outro toque no
 *  mesmo chip limpa. Um botão só salva a ficha inteira. */
export function TechnicalSheetForm({ slug, clientId, clientName, initial, updatedAt }: TechnicalSheetFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<FormState>(() => toForm(initial));
  const [state, setState] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useMemo(() => JSON.stringify(toPayload(state)) !== JSON.stringify(toPayload(saved)), [state, saved]);

  const set = (key: string, value: FormValue) => {
    setJustSaved(false);
    setError(null);
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional/clients/${clientId}/ficha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, technical: toPayload(state) }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(state);
        setJustSaved(true);
        router.refresh();
        return;
      }
      setError(json.message || 'Não foi possível salvar.');
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link href={`/app/${slug}/clientes/${clientId}`} className="self-start flex items-center gap-1 text-[15px] font-semibold text-ink-soft -ml-1">
        <ChevronLeft className="w-4 h-4" /> {clientName}
      </Link>

      <div>
        <h1 className="font-serif-pro font-bold text-2xl text-ink leading-tight">Ficha técnica</h1>
        <p className="text-sm text-ink-soft">
          {updatedAt
            ? `Atualizada em ${new Date(updatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
            : 'Ainda não preenchida. Toque nas opções para preencher.'}
        </p>
      </div>

      {/* Fora das gravações e cliques do analytics: é dado pessoal da cliente. */}
      <div className="ph-no-capture flex flex-col gap-4">
        {TECH_SECTIONS.map((section, i) => {
          const Icon = SECTION_ICONS[i] || Sparkles;
          return (
            <section key={section.title} className="rounded-2xl bg-surface border border-linen p-4 flex flex-col gap-5">
              <h2 className="font-serif-pro font-bold text-lg text-ink flex items-center gap-2">
                <Icon className="w-5 h-5 text-rose-600" /> {section.title}
              </h2>
              {section.fields.map((field) => (
                <FieldInput key={field.key} field={field} value={state[field.key]} onChange={(v) => set(field.key, v)} />
              ))}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2">
        {error && <p className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[15px] px-4 py-3">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className={`h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg transition ${
            dirty ? 'bg-rose-600 text-white active:scale-95' : 'bg-surface border border-linen text-ink-soft'
          }`}
        >
          {saving ? 'Salvando...' : dirty ? 'Salvar ficha' : justSaved ? (<><Check className="w-5 h-5 text-emerald-600" /> Ficha salva</>) : 'Nenhuma alteração'}
        </button>
      </div>
    </>
  );
}

function FieldInput({ field, value, onChange }: { field: TechField; value: FormValue; onChange: (v: FormValue) => void }) {
  const label = <p className="text-sm font-semibold text-ink-soft">{field.label}</p>;

  if (field.kind === 'choice') {
    return (
      <div className="flex flex-col gap-2">
        {label}
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => {
            const on = value === o.value;
            return (
              <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? undefined : o.value)} className={`${chipBase} ${on ? chipOn : chipOff}`}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.kind === 'yesno') {
    return (
      <div className="flex flex-col gap-2">
        {label}
        <div className="flex gap-2">
          {[
            { v: true, l: 'Sim' },
            { v: false, l: 'Não' },
          ].map((o) => {
            const on = value === o.v;
            return (
              <button key={o.l} type="button" aria-pressed={on} onClick={() => onChange(on ? undefined : o.v)} className={`${chipBase} min-w-20 text-center ${on ? chipOn : chipOff}`}>
                {o.l}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const inputClass =
    'rounded-xl border border-linen bg-cream px-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400';

  if (field.kind === 'days') {
    return (
      <label className="flex flex-col gap-2">
        {label}
        <div className="flex items-center gap-2">
          <input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode="numeric"
            placeholder={field.placeholder}
            autoComplete="off"
            className={`${inputClass} h-12 w-28`}
          />
          <span className="text-[15px] text-ink-soft">dias</span>
        </div>
        {typeof value === 'string' && value !== '' && (Number(value) < 1 || Number(value) > MAX_TECH_DAYS) && (
          <span className="text-sm text-rose-600">Entre 1 e {MAX_TECH_DAYS} dias.</span>
        )}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-2">
      {label}
      {field.multiline ? (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max}
          rows={3}
          placeholder={field.placeholder}
          className={`${inputClass} py-3 resize-none`}
        />
      ) : (
        <input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max}
          placeholder={field.placeholder}
          autoComplete="off"
          className={`${inputClass} h-12`}
        />
      )}
    </label>
  );
}
