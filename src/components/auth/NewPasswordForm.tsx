'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock } from 'lucide-react';
import { PASSWORD_MIN, passwordProblem } from '@/lib/auth/access-rules';

/** Formulário da nova senha (F11.6). Grava pelo servidor
 *  (`/api/auth/password-update`), que já abre o app. */
export function NewPasswordForm({ tokenHash }: { tokenHash: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [linkBad, setLinkBad] = useState(!tokenHash);
  const [savedNoStudio, setSavedNoStudio] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('As duas senhas não são iguais.');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/password-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_hash: tokenHash, password }),
      });
      const json = (await res.json()) as { success: boolean; slug?: string | null; code?: string; message?: string };
      if (!json.success) {
        if (json.code === 'link') setLinkBad(true);
        setError(json.message || 'Não foi possível salvar. Tente de novo.');
        return;
      }
      if (json.slug) {
        router.replace(`/app/${json.slug}/inicio`);
        return;
      }
      setSavedNoStudio(true);
    } catch {
      setError('Falha na conexão. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink flex items-center justify-center p-6">
      <div className="max-w-sm w-full p-8 rounded-3xl bg-surface border border-linen shadow-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-serif-pro font-bold text-2xl text-ink">Nova senha</h1>
          <p className="text-[13px] text-ink-soft mt-1">Escolha a senha nova do seu LashAgenda</p>
        </div>

        {savedNoStudio ? (
          <p className="text-[15px] text-ink-soft text-center">
            Senha nova salva.{' '}
            <Link href="/entrar" className="font-bold text-rose-600">
              Entrar com ela
            </Link>
          </p>
        ) : linkBad ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-[15px] text-ink-soft leading-relaxed">
              {error || 'Esse link não é válido. Peça um novo em "Esqueci a senha".'}
            </p>
            <Link
              href="/entrar?esqueci=1"
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold flex items-center justify-center"
            >
              Pedir um link novo
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                placeholder={`Nova senha (mínimo ${PASSWORD_MIN})`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl bg-cream border border-linen pl-9 pr-3 text-base text-ink placeholder:text-ink-faint"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repita a senha nova"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full h-11 rounded-xl bg-cream border border-linen pl-9 pr-3 text-base text-ink placeholder:text-ink-faint"
              />
            </div>
            {error && <p className="text-[13px] text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar e entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
