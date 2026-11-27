import { Users } from 'lucide-react';
import { PageTitleBarSkeleton } from '@/components/app-shell/PageTitleBarSkeleton';
import { LoadingSpinner } from '@/components/app-shell/LoadingSpinner';

/** Tela de carregamento da aba Clientes (mesmo padrão da Agenda). */
export default function ClientesLoading() {
  return (
    <>
      <PageTitleBarSkeleton title="Clientes" icon={<Users className="w-5 h-5 text-ink-soft" />} />
      <LoadingSpinner />
    </>
  );
}
