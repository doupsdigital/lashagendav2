'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ImageIcon } from 'lucide-react';
import { formatPhoneBR } from '@/lib/format';
import { MAX_ADDRESS, MAX_OWNER_NAME, MAX_STUDIO_NAME } from '@/lib/studio/business-profile';
import type { BusinessProfile } from '@/lib/studio/business-service';

interface BusinessSectionProps {
  slug: string;
  initial: BusinessProfile;
}

type FieldKey = 'owner_name' | 'studio_name' | 'whatsapp' | 'instagram' | 'address' | 'maps_url';

const inputCls =
  'w-full h-12 rounded-xl border bg-cream px-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-rose-300';

/** "Meu negócio" (F10.1): os dados do estúdio que aparecem no catálogo. É o
 *  mesmo dado que o editor do catálogo mexe — mudar aqui muda lá. A foto
 *  continua sendo trocada no editor (lá tem o recorte e o envio). */
export const BusinessSection: React.FC<BusinessSectionProps> = ({ slug, initial }) => {
  const router = useRouter();
  const [form, setForm] = useState<Record<FieldKey, string>>({
    owner_name: initial.owner_name,
    studio_name: initial.studio_name,
    whatsapp: initial.whatsapp ? formatPhoneBR(initial.whatsapp) : '',
    instagram: initial.instagram ? `@${initial.instagram}` : '',
    address: initial.address,
    maps_url: initial.maps_url,
  });
  const [saved, setSaved] = useState(form);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [done, setDone] = useState(false);

  const dirty = (Object.keys(form) as FieldKey[]).some((k) => form[k] !== saved[k]);
  const set = (k: FieldKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDone(false);
    if (error?.field === k) setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/professional/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      const json = await res.json();
      if (!json.success) {
        setError({ field: json.field, message: json.message || 'Não foi possível salvar. Tente de novo.' });
        return;
      }
      const p = json.profile as { owner_name: string; studio_name: string | null; whatsapp: string; instagram: string | null; address: string | null; maps_url: string | null };
      const next = {
        owner_name: p.owner_name,
        studio_name: p.studio_name || '',
        whatsapp: formatPhoneBR(p.whatsapp),
        instagram: p.instagram ? `@${p.instagram}` : '',
        address: p.address || '',
        maps_url: p.maps_url || '',
      };
      setForm(next);
      setSaved(next);
      setDone(true);
      router.refresh();
    } catch {
      setError({ message: 'Falha na conexão. Tente de novo.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (k: FieldKey, label: string, el: React.ReactNode, hint?: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-ink-soft">{label}</span>
      {el}
      {error?.field === k ? (
        <span className="text-[14px] text-rose-700">{error.message}</span>
      ) : (
        hint && <span className="text-[13px] text-ink-faint">{hint}</span>
      )}
    </label>
  );
  const border = (k: FieldKey) => (error?.field === k ? 'border-rose-400' : 'border-linen');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-rose-100 overflow-hidden flex items-center justify-center shrink-0 border border-linen">
          {initial.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initial.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-rose-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">Sua foto</p>
          <Link href={`/app/${slug}/catalogo`} className="text-[14px] font-bold text-rose-600">
            Trocar no editor do catálogo
          </Link>
        </div>
      </div>

      {field(
        'owner_name',
        'Seu nome',
        <input className={`${inputCls} ${border('owner_name')}`} value={form.owner_name} maxLength={MAX_OWNER_NAME} onChange={(e) => set('owner_name', e.target.value)} autoComplete="name" />,
        'Aparece em destaque no topo do catálogo.'
      )}
      {field(
        'studio_name',
        'Nome do estúdio',
        <input
          className={`${inputCls} ${border('studio_name')}`}
          value={form.studio_name}
          maxLength={MAX_STUDIO_NAME}
          placeholder="Ex.: Studio da Ju"
          onChange={(e) => set('studio_name', e.target.value)}
        />,
        'Aparece no título do link quando você compartilha. Opcional.'
      )}
      {field(
        'whatsapp',
        'WhatsApp',
        <input
          className={`${inputCls} ${border('whatsapp')}`}
          value={form.whatsapp}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(62) 99999-0000"
          onChange={(e) => set('whatsapp', formatPhoneBR(e.target.value))}
        />,
        'Onde as clientes falam com você pelo catálogo.'
      )}
      {field(
        'instagram',
        'Instagram',
        <input
          className={`${inputCls} ${border('instagram')}`}
          value={form.instagram}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="@seuperfil"
          onChange={(e) => set('instagram', e.target.value)}
        />,
        'Opcional.'
      )}
      {field(
        'address',
        'Endereço',
        <input
          className={`${inputCls} ${border('address')}`}
          value={form.address}
          maxLength={MAX_ADDRESS}
          placeholder="Ex.: Rua 10, nº 5 — Centro"
          onChange={(e) => set('address', e.target.value)}
        />,
        'Opcional.'
      )}
      {field(
        'maps_url',
        'Link do mapa',
        <input
          className={`${inputCls} ${border('maps_url')}`}
          value={form.maps_url}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://maps.app.goo.gl/..."
          onChange={(e) => set('maps_url', e.target.value)}
        />,
        'No Google Maps, toque em Compartilhar e copie o link. Opcional.'
      )}

      {error && !error.field && <p className="text-[14px] text-rose-700">{error.message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="h-12 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? 'Salvando…' : done && !dirty ? (<><Check className="w-4 h-4" /> Salvo</>) : 'Salvar'}
      </button>
    </div>
  );
};
