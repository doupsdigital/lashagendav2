import type { Metadata } from 'next';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';

export const metadata: Metadata = {
  title: 'Nova senha — LashAgenda',
  robots: { index: false, follow: false },
};

interface NovaSenhaPageProps {
  searchParams: Promise<{ token_hash?: string }>;
}

/** Fim do "Esqueci a senha" (F11.6): o link do e-mail traz o `token_hash`.
 *  Abrir a página não gasta o link — só o envio da senha nova. */
export default async function NovaSenhaPage({ searchParams }: NovaSenhaPageProps) {
  const { token_hash } = await searchParams;
  return <NewPasswordForm tokenHash={typeof token_hash === 'string' ? token_hash : ''} />;
}
