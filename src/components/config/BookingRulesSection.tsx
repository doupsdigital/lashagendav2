'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import {
  CANCEL_OPTIONS,
  MAX_POST_BOOKING_MESSAGE,
  MIN_NOTICE_OPTIONS,
  WINDOW_OPTIONS,
  optionsWith,
  type BookingRules,
  type RuleOption,
} from '@/lib/studio/booking-rules';

interface BookingRulesSectionProps {
  slug: string;
  initial: BookingRules;
}

const minutesLabel = (v: number) => (v % 60 === 0 ? `${v / 60}h` : v > 60 ? `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}` : `${v} min`);

const Chips: React.FC<{ options: RuleOption[]; value: number; onChange: (v: number) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-full border px-3.5 text-[15px] font-semibold transition active:scale-95 ${
            on ? 'bg-rose-600 border-rose-600 text-white' : 'bg-surface border-linen text-ink'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const Group: React.FC<{ title: string; hint: string; children: React.ReactNode; error?: string }> = ({ title, hint, children, error }) => (
  <div className="flex flex-col gap-2">
    <div>
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="text-[14px] text-ink-soft leading-snug">{hint}</p>
    </div>
    {children}
    {error && <p className="text-[14px] text-rose-700">{error}</p>}
  </div>
);

/** Regras de agendamento (F10.2): como o agendamento online do catálogo se
 *  comporta. Os valores já valiam (padrões do banco); aqui ganham tela. */
export const BookingRulesSection: React.FC<BookingRulesSectionProps> = ({ slug, initial }) => {
  const router = useRouter();
  const [form, setForm] = useState<BookingRules>(initial);
  const [saved, setSaved] = useState<BookingRules>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof BookingRules>(k: K, v: BookingRules[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDone(false);
    if (error?.field === k) setError(null);
  };
  const errFor = (k: keyof BookingRules) => (error?.field === k ? error.message : undefined);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/professional/booking-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      const json = await res.json();
      if (!json.success) {
        setError({ field: json.field, message: json.message || 'Não foi possível salvar. Tente de novo.' });
        return;
      }
      setForm(json.rules);
      setSaved(json.rules);
      setDone(true);
      router.refresh();
    } catch {
      setError({ message: 'Falha na conexão. Tente de novo.' });
    } finally {
      setSaving(false);
    }
  };

  const modes: { id: BookingRules['booking_mode']; title: string; text: string }[] = [
    { id: 'approval', title: 'Eu confirmo cada um', text: 'O pedido entra como "aguardando" e você confirma na Agenda.' },
    { id: 'auto', title: 'Confirmar sozinho', text: 'O horário já fica confirmado assim que ela agenda.' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Group title="Como os agendamentos entram" hint="Quando a cliente agenda pelo catálogo." error={errFor('booking_mode')}>
        <div className="flex flex-col gap-2">
          {modes.map((m) => {
            const on = form.booking_mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => set('booking_mode', m.id)}
                className={`text-left rounded-xl border-2 px-4 py-3 transition ${on ? 'border-rose-600 bg-rose-50' : 'border-linen bg-surface'}`}
              >
                <span className="flex items-center gap-2 font-bold text-[15px] text-ink">
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${on ? 'border-rose-600 bg-rose-600 shadow-[inset_0_0_0_2px_white]' : 'border-ink-faint'}`} />
                  {m.title}
                </span>
                <span className="block text-[14px] text-ink-soft mt-0.5 pl-6">{m.text}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group
        title="Botão de WhatsApp nos serviços"
        hint="Além de agendar online, a cliente também pode chamar você no WhatsApp."
        error={errFor('whatsapp_button_enabled')}
      >
        <button
          type="button"
          role="switch"
          aria-checked={form.whatsapp_button_enabled}
          onClick={() => set('whatsapp_button_enabled', !form.whatsapp_button_enabled)}
          className="flex items-center gap-3 self-start"
        >
          <span className={`w-12 h-7 rounded-full p-0.5 transition-colors ${form.whatsapp_button_enabled ? 'bg-rose-600' : 'bg-linen'}`}>
            <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${form.whatsapp_button_enabled ? 'translate-x-5' : ''}`} />
          </span>
          <span className="text-[15px] font-semibold text-ink">{form.whatsapp_button_enabled ? 'Aparece' : 'Não aparece'}</span>
        </button>
      </Group>

      <Group title="Antecedência mínima" hint="Quanto tempo antes do horário ela ainda consegue agendar." error={errFor('min_notice_minutes')}>
        <Chips options={optionsWith(MIN_NOTICE_OPTIONS, form.min_notice_minutes, minutesLabel)} value={form.min_notice_minutes} onChange={(v) => set('min_notice_minutes', v)} />
      </Group>

      <Group title="Até quantos dias à frente" hint="Até onde a agenda aparece aberta para ela escolher." error={errFor('booking_window_days')}>
        <Chips options={optionsWith(WINDOW_OPTIONS, form.booking_window_days, (v) => `${v} dias`)} value={form.booking_window_days} onChange={(v) => set('booking_window_days', v)} />
      </Group>

      <Group
        title="Cancelar pelo link"
        hint="Até quando ela cancela sozinha pelo link do agendamento. Depois disso, só falando com você."
        error={errFor('cancellation_notice_hours')}
      >
        <Chips options={optionsWith(CANCEL_OPTIONS, form.cancellation_notice_hours, (v) => `${v}h antes`)} value={form.cancellation_notice_hours} onChange={(v) => set('cancellation_notice_hours', v)} />
      </Group>

      <Group title="Mensagem depois de agendar" hint="Aparece para a cliente logo depois que ela agenda. Opcional." error={errFor('post_booking_message')}>
        <textarea
          value={form.post_booking_message}
          maxLength={MAX_POST_BOOKING_MESSAGE}
          rows={3}
          placeholder="Ex.: Chegue 10 minutos antes e venha sem maquiagem nos olhos."
          onChange={(e) => set('post_booking_message', e.target.value)}
          className={`w-full rounded-xl border bg-cream px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-rose-300 ${
            errFor('post_booking_message') ? 'border-rose-400' : 'border-linen'
          }`}
        />
        <p className="text-[13px] text-ink-faint text-right -mt-1">
          {form.post_booking_message.length}/{MAX_POST_BOOKING_MESSAGE}
        </p>
      </Group>

      {error && !error.field && <p className="text-[14px] text-rose-700">{error.message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? 'Salvando…' : done && !dirty ? (<><Check className="w-4 h-4" /> Salvo</>) : 'Salvar regras'}
      </button>
    </div>
  );
};
