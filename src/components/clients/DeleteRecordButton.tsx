'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteRecordButtonProps {
  slug: string;
  clientId: string;
  recordId: string;
}

/** Apagar um atendimento registrado à mão (F7.4), com confirmação ali mesmo.
 *  Só aparece em registros — agendamentos de verdade se cancelam na agenda. */
export const DeleteRecordButton: React.FC<DeleteRecordButtonProps> = ({ slug, clientId, recordId }) => {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional/clients/${clientId}/records/${recordId}?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível apagar.');
        return;
      }
      router.refresh();
    } catch {
      setError('Falha na conexão.');
    } finally {
      setRemoving(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="self-start text-sm font-semibold text-ink-faint">
        Apagar registro
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink-soft">Apagar esse registro?</span>
        <button type="button" onClick={() => setConfirming(false)} disabled={removing} className="font-semibold text-ink-soft">
          Não
        </button>
        <button type="button" onClick={remove} disabled={removing} className="font-bold text-rose-600">
          {removing ? 'Apagando...' : 'Sim, apagar'}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
};
