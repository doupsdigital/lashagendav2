'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, MessageCircle, Pencil, Trash2, Cake, StickyNote, ClipboardPlus } from 'lucide-react';
import { formatPhoneBR, normalizeWhatsappBR } from '@/lib/format';
import {
  birthDateLabel,
  deleteBlockedMessage,
  MAX_CLIENT_EMAIL,
  MAX_CLIENT_NOTES,
  MAX_PROFILE_NAME,
} from '@/lib/clients/client-profile';
import type { ClientProfile } from '@/lib/clients/client-service';
import type { ManualBookingService } from '@/lib/scheduling/agenda-service';
import { RecordVisitSheet } from './RecordVisitSheet';

interface ClientProfileClientProps {
  slug: string;
  client: ClientProfile;
  /** Agendamentos de qualquer status — com algum, não dá para excluir. */
  appointments: number;
  /** "AAAA-MM-DD" no fuso do estúdio (idade e limite da data de nascimento). */
  today: string;
  /** Serviços ativos, para registrar atendimento (F7.4). */
  services: ManualBookingService[];
  /** Resumo do histórico (F7.3), logo abaixo do nome. */
  summary?: React.ReactNode;
  /** Próximos e passados (F7.3), antes do excluir. */
  history?: React.ReactNode;
}

const inputClass =
  'h-12 rounded-xl border border-linen bg-cream px-4 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400';

export const ClientProfileClient: React.FC<ClientProfileClientProps> = ({ slug, client, appointments, today, services, summary, history }) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const listHref = `/app/${slug}/clientes`;

  return (
    <>
      <Link href={listHref} className="self-start flex items-center gap-1 text-[15px] font-semibold text-ink-soft -ml-1">
        <ChevronLeft className="w-4 h-4" /> Clientes
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 text-xl font-bold flex items-center justify-center shrink-0">
          {client.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif-pro font-bold text-2xl text-ink leading-tight break-words">{client.name}</h1>
          <p className="text-sm text-ink-soft">
            {client.source === 'booking' ? 'Chegou pelo catálogo' : 'Cadastrada por você'} em{' '}
            {new Date(client.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      </div>

      {!editing && summary}

      {saved && !editing && (
        <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[15px] px-4 py-3">{saved}</p>
      )}

      {editing ? (
        <EditClientForm
          slug={slug}
          client={client}
          today={today}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved('Dados salvos.');
            router.refresh();
          }}
        />
      ) : (
        <>
          {client.whatsapp && (
            <a
              href={`https://wa.me/${normalizeWhatsappBR(client.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 rounded-xl bg-emerald-600 text-white text-[15px] font-bold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp · {formatPhoneBR(client.whatsapp)}
            </a>
          )}

          <div className="rounded-2xl bg-surface border border-linen divide-y divide-linen">
            <InfoRow icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" value={client.whatsapp ? formatPhoneBR(client.whatsapp) : null} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="E-mail" value={client.email} />
            <InfoRow icon={<Cake className="w-4 h-4" />} label="Nascimento" value={client.birth_date ? birthDateLabel(client.birth_date, today) : null} />
            <InfoRow icon={<StickyNote className="w-4 h-4" />} label="Observações" value={client.notes} multiline />
          </div>

          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setEditing(true);
            }}
            className="h-12 rounded-xl border border-linen bg-surface text-ink text-[15px] font-bold flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" /> Editar dados
          </button>

          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setRecordOpen(true);
            }}
            className="h-12 rounded-xl border border-linen bg-surface text-ink text-[15px] font-bold flex items-center justify-center gap-2"
          >
            <ClipboardPlus className="w-4 h-4" /> Registrar atendimento
          </button>

          {history}

          <DeleteClientBlock slug={slug} client={client} appointments={appointments} onDeleted={() => router.replace(listHref)} />
        </>
      )}

      {recordOpen && (
        <RecordVisitSheet
          slug={slug}
          clientId={client.id}
          clientName={client.name}
          services={services}
          today={today}
          onClose={() => setRecordOpen(false)}
          onSaved={() => {
            setRecordOpen(false);
            setSaved('Atendimento registrado. Já está no histórico.');
            router.refresh();
          }}
        />
      )}
    </>
  );
};

function InfoRow({ icon, label, value, multiline }: { icon: React.ReactNode; label: string; value: string | null; multiline?: boolean }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="text-ink-faint mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">{label}</p>
        <p className={`text-[15px] ${value ? 'text-ink' : 'text-ink-faint'} ${multiline ? 'whitespace-pre-line break-words' : 'truncate'}`}>
          {value || 'Não informado'}
        </p>
      </div>
    </div>
  );
}

interface EditClientFormProps {
  slug: string;
  client: ClientProfile;
  today: string;
  onCancel: () => void;
  onSaved: () => void;
}

function EditClientForm({ slug, client, today, onCancel, onSaved }: EditClientFormProps) {
  const [name, setName] = useState(client.name);
  const [whatsapp, setWhatsapp] = useState(client.whatsapp ? formatPhoneBR(client.whatsapp) : '');
  const [email, setEmail] = useState(client.email || '');
  const [birthDate, setBirthDate] = useState(client.birth_date || '');
  const [notes, setNotes] = useState(client.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch(`/api/professional/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, whatsapp, email, birth_date: birthDate, notes }),
      });
      const json = await res.json();
      if (json.success) {
        onSaved();
        return;
      }
      if (json.reason === 'duplicate') setDuplicate(json.duplicate);
      setError(json.message || 'Não foi possível salvar.');
    } catch {
      setError('Falha na conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-surface border border-linen p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink-soft">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_PROFILE_NAME} autoComplete="off" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink-soft">WhatsApp</span>
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
          inputMode="tel"
          placeholder="(00) 00000-0000"
          autoComplete="off"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink-soft">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={MAX_CLIENT_EMAIL}
          inputMode="email"
          autoComplete="off"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink-soft">Data de nascimento</span>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} min="1900-01-01" max={today} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink-soft">Observações</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_CLIENT_NOTES}
          rows={4}
          placeholder="Ex.: prefere horário de manhã"
          className="rounded-xl border border-linen bg-cream px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-rose-400 resize-none"
        />
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {duplicate && (
        <Link href={`/app/${slug}/clientes/${duplicate.id}`} className="text-[15px] font-bold text-rose-600">
          Ver {duplicate.name}
        </Link>
      )}

      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onCancel} disabled={saving} className="flex-1 h-12 rounded-xl bg-linen text-ink-soft text-[15px] font-bold">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="flex-1 h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

interface DeleteClientBlockProps {
  slug: string;
  client: ClientProfile;
  appointments: number;
  onDeleted: () => void;
}

/** Excluir com confirmação na própria tela. Com agendamentos, nem chega a
 *  pedir confirmação: explica por que não dá (o servidor também recusa). */
function DeleteClientBlock({ slug, client, appointments, onDeleted }: DeleteClientBlockProps) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'blocked'>('idle');
  const [blockedMessage, setBlockedMessage] = useState(deleteBlockedMessage(appointments));
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional/clients/${client.id}?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        onDeleted();
        return;
      }
      if (json.reason === 'has_history') {
        setBlockedMessage(json.message);
        setStep('blocked');
        return;
      }
      setError(json.message || 'Não foi possível excluir.');
    } catch {
      setError('Falha na conexão.');
    } finally {
      setRemoving(false);
    }
  };

  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep(appointments > 0 ? 'blocked' : 'confirm')}
        className="h-11 text-[15px] font-semibold text-rose-600 flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" /> Excluir cliente
      </button>
    );
  }

  if (step === 'blocked') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-col gap-2">
        <p className="text-[15px] text-amber-900">{blockedMessage}</p>
        <button type="button" onClick={() => setStep('idle')} className="self-start text-[15px] font-bold text-amber-900">
          Entendi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex flex-col gap-3">
      <p className="text-[15px] text-rose-900">
        Excluir <strong>{client.name}</strong>? Os dados dela somem do app e não dá para desfazer.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep('idle')}
          disabled={removing}
          className="flex-1 h-11 rounded-xl bg-surface border border-linen text-ink-soft text-[15px] font-bold"
        >
          Voltar
        </button>
        <button type="button" onClick={remove} disabled={removing} className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-60">
          {removing ? 'Excluindo...' : 'Sim, excluir'}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
