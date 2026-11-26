'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, KeyRound, LogOut } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { GoogleIcon } from '@/components/auth/GoogleIcon';

interface AccountSectionProps {
  slug: string;
  /** Presente quando a profissional já vinculou um login (Supabase Auth) —
   *  a partir daí ela pode entrar direto por `/entrar`, sem link mágico. */
  hasAccount: boolean;
  /** E-mail do login vinculado (F10.4), quando há. */
  accountEmail?: string | null;
  /** Usado dentro de "Primeiros passos" (funil `/lash`, 2026-11-18): o login
   *  com Google volta pra essa tela, sem o botão "Sair desse dispositivo", e avisa o pai
   *  quando o acesso fica pronto. */
  inOnboarding?: boolean;
  onDone?: () => void;
}

/** Vincula uma conta do Supabase Auth (recém criada/logada no client) ao
 *  catálogo atual, via a mesma rota que o callback do Google usa. */
async function claimAccount(slug: string, accessToken: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/professional/claim-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, access_token: accessToken }),
  });
  return res.json();
}

export const AccountSection: React.FC<AccountSectionProps> = ({ slug, hasAccount, accountEmail = null, inOnboarding = false, onDone }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'password' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [done, setDone] = useState(hasAccount);
  const [justLinkedGoogle, setJustLinkedGoogle] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Sem acesso criado, sair deixa ela dependendo do link mágico: pede confirmação (F10.4).
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/professional/logout', { method: 'POST' });
      await supabaseBrowser.auth.signOut().catch(() => {});
    } finally {
      router.push('/entrar');
      router.refresh();
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vinculado') === 'google') {
      setJustLinkedGoogle(true);
      setDone(true);
      params.delete('vinculado');
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
    }
  }, []);

  const finishClaim = async (accessToken: string) => {
    const result = await claimAccount(slug, accessToken);
    if (!result.success) {
      setError(result.message || 'Não foi possível vincular sua conta.');
      return;
    }
    setDone(true);
    setNeedsConfirmation(false);
    onDone?.();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('password');
    setError('');

    try {
      const { data, error: authError } = await supabaseBrowser.auth.signUp({ email: email.trim(), password });
      if (authError) {
        if (!authError.message.includes('already registered')) {
          setError('Não foi possível criar a conta. Confira o e-mail e a senha (mínimo 6 caracteres).');
          return;
        }
        // Já existe conta com esse e-mail (F10.4: antes mandava tocar num
        // "Já tenho conta" que não existia): entra com a senha digitada e
        // vincula essa conta a este estúdio.
        const { data: signIn, error: signInError } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError || !signIn.session) {
          setError('Já existe uma conta com esse e-mail e a senha não confere. Se esqueceu a senha, fale com o suporte.');
          return;
        }
        await finishClaim(signIn.session.access_token);
        return;
      }

      if (data.session) {
        await finishClaim(data.session.access_token);
      } else {
        // Confirmação de e-mail ligada no projeto — a conta existe, mas só
        // tem sessão depois que a profissional confirmar pelo e-mail.
        setNeedsConfirmation(true);
      }
    } catch {
      setError('Falha na conexão. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleAlreadyConfirmed = async () => {
    setLoading('password');
    setError('');
    try {
      const { data, error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data.session) {
        setError('Ainda não deu pra confirmar — confira seu e-mail e tente de novo.');
        return;
      }
      await finishClaim(data.session.access_token);
    } catch {
      setError('Falha na conexão. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLink = async () => {
    setLoading('google');
    setError('');
    try {
      const redirectTo = `${window.location.origin}/entrar/callback?claim=1&slug=${slug}${inOnboarding ? '&volta=passos' : ''}`;
      const { error: authError } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (authError) {
        setError('Não foi possível iniciar o vínculo com Google.');
        setLoading(null);
      }
    } catch {
      setError('Falha na conexão. Tente novamente.');
      setLoading(null);
    }
  };

  const logoutButton =
    !done && confirmLogout ? (
      <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-col gap-3">
        <p className="text-[14px] text-amber-900 leading-snug">
          Você ainda não criou um acesso com senha ou Google. Depois de sair, só entra de novo pelo seu link de acesso
          (aquele que chegou no e-mail da compra).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmLogout(false)}
            className="flex-1 h-11 rounded-xl bg-surface border border-linen text-ink text-[15px] font-bold"
          >
            Ficar
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[15px] font-bold disabled:opacity-50"
          >
            {loggingOut ? 'Saindo...' : 'Sair mesmo assim'}
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => (done ? handleLogout() : setConfirmLogout(true))}
        disabled={loggingOut}
        className="w-full h-11 mt-4 rounded-xl border border-linen text-ink-soft text-[15px] font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? 'Saindo...' : 'Sair desse dispositivo'}
      </button>
    );

  if (done) {
    return (
      <div>
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/60 border border-rose-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-serif-pro font-bold text-lg text-rose-800 leading-tight">Acesso configurado</p>
              {/* Reescrito mais claro/informativo, e com o endereço virando
               *  link de verdade (bug real reportado, 2026-09-23 — antes
               *  era só texto, não dava pra tocar) — separa em duas frases
               *  curtas (o que mudou / como entrar) em vez de uma só longa. */}
              <p className="text-sm text-rose-800/70 mt-0.5">
                {justLinkedGoogle && 'Conta Google vinculada com sucesso! '}
                Você não depende mais do link mágico pra acessar. Da próxima vez, é só entrar direto com seu e-mail e senha
                (ou Google) em{' '}
                <Link href="/entrar" className="font-semibold text-rose-800 underline underline-offset-2">
                  lashagenda.com/entrar
                </Link>
                .
              </p>
              {accountEmail && (
                <p className="text-sm text-rose-800 mt-1.5">
                  Entra com: <strong className="break-all">{accountEmail}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
        {!inOnboarding && logoutButton}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-cream border border-rose-200 p-5">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="font-serif-pro font-bold text-lg text-ink">Crie um acesso com senha</p>
          <p className="text-[15px] text-ink-soft mt-0.5">Pra entrar direto, sem precisar do link mágico toda vez.</p>
        </div>

        {needsConfirmation ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft text-center leading-relaxed">
              Enviamos um e-mail de confirmação pra <strong>{email}</strong>. Depois de confirmar, toque no botão
              abaixo.
            </p>
            {error && <p className="text-sm text-rose-600 text-center">{error}</p>}
            <button
              type="button"
              onClick={handleAlreadyConfirmed}
              disabled={loading !== null}
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold disabled:opacity-50 transition-colors"
            >
              {loading === 'password' ? 'Verificando...' : 'Já confirmei'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-surface border border-linen px-3 text-base text-ink placeholder:text-ink-faint"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-surface border border-linen px-3 text-base text-ink placeholder:text-ink-faint"
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading !== null}
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold disabled:opacity-50 transition-colors"
            >
              {loading === 'password' ? 'Criando...' : 'Criar acesso'}
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-rose-200 flex-1" />
          <span className="text-[13px] text-ink-faint">ou</span>
          <div className="h-px bg-rose-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLink}
          disabled={loading !== null}
          className="w-full h-11 rounded-xl bg-surface border border-linen text-ink text-[15px] font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'google' ? (
            'Redirecionando...'
          ) : (
            <>
              <GoogleIcon className="w-4 h-4" />
              Vincular com Google
            </>
          )}
        </button>
      </div>
      {!inOnboarding && logoutButton}
    </div>
  );
};
