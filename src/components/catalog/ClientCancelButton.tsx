'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientCancelButtonProps {
  slug: string;
  token: string;
  /** Classes do tema (Rosé/Luxury) vindas da página. */
  buttonClass: string;
  dangerClass: string;
  mutedClass: string;
}

/** Cancelar pelo link único (F5.4), com confirmação na própria tela. */
export const ClientCancelButton: React.FC<ClientCancelButtonProps> = ({ slug, token, buttonClass, dangerClass, mutedClass }) => {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/scheduling/appointment/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Não foi possível cancelar.');
        return;
      }
      router.refresh();
    } catch {
      setError('Falha na conexão. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={buttonClass}>
        Cancelar agendamento
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={`text-[15px] text-center ${mutedClass}`}>Tem certeza? O horário fica livre para outra pessoa.</p>
      {error && <p className="text-sm text-center text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className={`flex-1 ${buttonClass}`}>
          Voltar
        </button>
        <button type="button" onClick={handleCancel} disabled={submitting} className={`flex-1 ${dangerClass}`}>
          {submitting ? 'Cancelando...' : 'Sim, cancelar'}
        </button>
      </div>
    </div>
  );
};
