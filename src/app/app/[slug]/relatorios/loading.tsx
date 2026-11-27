import { BarChart3 } from 'lucide-react';
import { PageTitleBarSkeleton } from '@/components/app-shell/PageTitleBarSkeleton';
import { LoadingSpinner } from '@/components/app-shell/LoadingSpinner';

/** Tela de carregamento dos Relatórios — mesmo padrão das abas. */
export default function RelatoriosLoading() {
  return (
    <>
      <PageTitleBarSkeleton title="Relatórios" icon={<BarChart3 className="w-5 h-5 text-ink-soft" />} />
      <LoadingSpinner />
    </>
  );
}
