'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { GoogleIcon } from './GoogleIcon';

/** Troca uma sessão do Supabase Auth (já estabelecida no client) pelo cookie
 *  de sessão do app (`sm_pro_session`) e redireciona pro Início do catálogo
 *  vinculado. Usado tanto pelo login por e-mail/senha quanto pelo retorno
 *  do Google em `/entrar/callback`. */
async function completeLogin(accessToken: string): Promise<{ success: boolean; message?: string; slug?: string }> {
  const res = await fetch('/api/professional/session-from-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });
  return res.json();
}

export function ProfessionalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'password' | 'google' | 'forgot' | null>(null);
  const [error, setError] = useState('');
  // "Esqueci a senha" (F11.6): mesma tela, outro formulário. `?esqueci=1`
  // abre direto (link "Pedir um link novo" da tela de nova senha).
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('esqueci') === '1') setForgot(true);
  }, []);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('forgot');
    setError('');
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!json.success) {
        setError(json.message || 'Não foi possível mandar agora. Tente de novo.');
        return;
      }
      setForgotSent(json.message || 'Pronto! Confira seu e-mail.');
    } catch {
      setError('Falha na conexão. Tente de novo.');
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('password');
    setError('');

    try {
      const { data, error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data.session) {
        setError('E-mail ou senha incorretos.');
        return;
      }

      const result = await completeLogin(data.session.access_token);
      if (!result.success || !result.slug) {
        setError(result.message || 'Não foi possível entrar.');
        return;
      }

      router.push(`/app/${result.slug}/inicio`);
    } catch {
      setError('Falha na conexão. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setError('');
    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/entrar/callback` },
      });
      if (authError) {
        setError('Não foi possível iniciar o login com Google.');
        setLoading(null);
      }
      // Em caso de sucesso o navegador é redirecionado pro Google — não há
      // mais nada a fazer aqui.
    } catch {
      setError('Falha na conexão. Tente novamente.');
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink flex items-center justify-center p-6">
      <div className="max-w-sm w-full p-8 rounded-3xl bg-surface border border-linen shadow-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="font-serif-pro font-bold text-2xl text-ink">Entrar</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            {forgot ? 'Vamos mandar um link para você criar uma nova senha' : 'Acesse o seu LashAgenda'}
          </p>
        </div>

        {forgot ? (
          <div className="flex flex-col gap-3">
            {forgotSent ? (
              <p className="text-[15px] text-ink-soft leading-relaxed text-center">{forgotSent}</p>
            ) : (
              <form onSubmit={handleForgot} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="O e-mail do seu acesso"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-cream border border-linen pl-9 pr-3 text-base text-ink placeholder:text-ink-faint"
                  />
                </div>
                {error && <p className="text-[13px] text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading !== null}
                  className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold disabled:opacity-50 transition-colors"
                >
                  {loading === 'forgot' ? 'Mandando...' : 'Mandar o link'}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setForgot(false);
                setForgotSent('');
                setError('');
              }}
              className="text-[13px] font-bold text-rose-600 py-1"
            >
              Voltar para entrar
            </button>
          </div>
        ) : (
        <>
        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              autoFocus
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-xl bg-cream border border-linen pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-faint"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 rounded-xl bg-cream border border-linen pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-faint"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setForgot(true);
              setError('');
            }}
            className="self-end text-[13px] font-semibold text-ink-soft underline underline-offset-2 -mt-1"
          >
            Esqueci a senha
          </button>

          {error && <p className="text-[13px] text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading !== null}
            className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[15px] font-bold disabled:opacity-50 transition-colors"
          >
            {loading === 'password' ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px bg-linen flex-1" />
          <span className="text-[13px] text-ink-faint">ou</span>
          <div className="h-px bg-linen flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading !== null}
          className="w-full h-11 rounded-xl bg-cream border border-linen text-ink text-[15px] font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'google' ? (
            'Redirecionando...'
          ) : (
            <>
              <GoogleIcon className="w-4 h-4" />
              Entrar com Google
            </>
          )}
        </button>

        <p className="text-[13px] text-ink-faint text-center leading-relaxed">
          Ainda não criou seu acesso? Entre pelo botão do e-mail da compra e crie em Config → Acesso.
        </p>
        </>
        )}
      </div>
    </main>
  );
}
